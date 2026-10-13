# windows-smoke: one Ctrl-C stops `pnpm dev` and leaves no process behind (W2, finding 1).
#
# Starts `pnpm dev` in a console of its own, as a terminal does, waits until it listens, types Ctrl-C
# into that console as a key press would (the console's input, not a signal), and then counts the
# processes it had started that are still there. Before the fix, turbo started each task through
# npm's batch file `pnpm.cmd`, and that cmd.exe waited for an answer to "Terminate batch job (Y/N)?"
# that nobody could give, so turbo and the tasks stayed. Whatever is left is killed at the end, so
# the runner is clean either way.
#
#   pwsh .github/scripts/dev-ctrl-c.ps1 [-Filter <package>] [-ReadyPort <port>]
#
# CI starts the storefront only: windows-latest has no Linux containers, so no database, and
# `next dev` starts without one, while `medusa develop` would not. The batch file was per task.
param(
  [string]$Filter = '@shopblok/storefront',
  # Internal: type Ctrl-C into the console of the process with this id, and exit (the script runs
  # itself for it, because attaching to another console means leaving its own).
  [int]$TypeCtrlCInto = 0,
  # `next dev` listens here once it is up. No page is asked for: with no database, every page fails.
  [int]$ReadyPort = 8000,
  [int]$ReadySeconds = 180,
  [int]$StopSeconds = 60,
  # Where `pnpm dev` writes its output (its console is hidden); the end of it is printed.
  [string]$LogFile = (Join-Path ([System.IO.Path]::GetTempPath()) 'pnpm-dev-ctrl-c.log')
)
$ErrorActionPreference = 'Stop'

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public static class ConsoleKeys {
  [DllImport("kernel32.dll", SetLastError = true)] static extern bool FreeConsole();
  [DllImport("kernel32.dll", SetLastError = true)] static extern bool AttachConsole(uint pid);
  [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
  static extern IntPtr CreateFileW(string name, uint access, uint share, IntPtr security, uint disposition, uint flags, IntPtr template);
  [DllImport("kernel32.dll", SetLastError = true)] static extern bool CloseHandle(IntPtr handle);
  [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
  static extern bool WriteConsoleInputW(IntPtr input, INPUT_RECORD[] records, uint count, out uint written);

  [StructLayout(LayoutKind.Explicit, CharSet = CharSet.Unicode)]
  struct INPUT_RECORD {
    [FieldOffset(0)] public ushort EventType;
    [FieldOffset(4)] public int KeyDown;
    [FieldOffset(8)] public ushort RepeatCount;
    [FieldOffset(10)] public ushort VirtualKeyCode;
    [FieldOffset(12)] public ushort VirtualScanCode;
    [FieldOffset(14)] public char UnicodeChar;
    [FieldOffset(16)] public uint ControlKeyState;
  }

  static INPUT_RECORD CtrlC(bool down) {
    // KEY_EVENT, the C key with the left Ctrl key held: the character is 0x03.
    return new INPUT_RECORD {
      EventType = 1, KeyDown = down ? 1 : 0, RepeatCount = 1, VirtualKeyCode = 0x43,
      VirtualScanCode = 0x2E, UnicodeChar = (char)3, ControlKeyState = 0x0008
    };
  }

  // Types Ctrl-C into the console that process `pid` is attached to. Returns an error, or null.
  public static string TypeCtrlC(uint pid) {
    FreeConsole();
    if (!AttachConsole(pid)) return "AttachConsole failed: " + Marshal.GetLastWin32Error();
    try {
      // GENERIC_READ | GENERIC_WRITE, FILE_SHARE_READ | FILE_SHARE_WRITE, OPEN_EXISTING
      IntPtr input = CreateFileW("CONIN$", 0xC0000000, 3, IntPtr.Zero, 3, 0, IntPtr.Zero);
      if (input == new IntPtr(-1)) return "CONIN$ failed: " + Marshal.GetLastWin32Error();
      try {
        uint written;
        var keys = new[] { CtrlC(true), CtrlC(false) };
        if (!WriteConsoleInputW(input, keys, 2, out written)) return "WriteConsoleInput failed: " + Marshal.GetLastWin32Error();
        return written == 2 ? null : "wrote " + written + " of 2 key events";
      } finally { CloseHandle(input); }
    } finally { FreeConsole(); }
  }
}
'@

if ($TypeCtrlCInto -ne 0) {
  $problem = [ConsoleKeys]::TypeCtrlC($TypeCtrlCInto)
  if ($problem) { [Console]::Error.WriteLine($problem); exit 1 }
  exit 0
}

function Get-Tree([int]$RootId) {
  $all = Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId, Name, CommandLine, CreationDate
  $tree = @()
  $queue = [System.Collections.Generic.Queue[int]]::new()
  $queue.Enqueue($RootId)
  while ($queue.Count -gt 0) {
    $id = $queue.Dequeue()
    foreach ($p in $all | Where-Object ProcessId -eq $id) { $tree += $p }
    foreach ($child in $all | Where-Object ParentProcessId -eq $id) { $queue.Enqueue($child.ProcessId) }
  }
  $tree
}

function Format-Process($p) {
  $line = if ($p.CommandLine) { $p.CommandLine } else { '' }
  if ($line.Length -gt 160) { $line = $line.Substring(0, 160) + '...' }
  "  $($p.ProcessId) $($p.Name) $line"
}

function Get-Alive($processes) {
  # The same process: its id and its start time (an id can be reused).
  $now = Get-CimInstance Win32_Process | Select-Object ProcessId, CreationDate
  @($processes | Where-Object { $p = $_; $now | Where-Object { $_.ProcessId -eq $p.ProcessId -and $_.CreationDate -eq $p.CreationDate } })
}

"pnpm: $((Get-Command pnpm).Source)"
# PowerShell then pnpm, in a new console: a terminal running `pnpm dev`.
# Only the output goes to the file: the input stays the console, which is what turbo looks at.
Remove-Item $LogFile -ErrorAction SilentlyContinue
$shell = Start-Process -FilePath (Get-Process -Id $PID).Path -PassThru -WindowStyle Hidden `
  -ArgumentList '-NoLogo', '-NoProfile', '-Command', "pnpm dev --filter $Filter *> '$LogFile'"

$deadline = (Get-Date).AddSeconds($ReadySeconds)
$ready = $false
while ((Get-Date) -lt $deadline -and -not $shell.HasExited) {
  if (Get-NetTCPConnection -State Listen -LocalPort $ReadyPort -ErrorAction SilentlyContinue) {
    $ready = $true
    break
  }
  Start-Sleep -Seconds 1
}
# Let the servers finish starting: the key goes to a running dev loop, not to one still booting.
if ($ready) { Start-Sleep -Seconds 10 }
$before = Get-Tree $shell.Id
"before Ctrl-C: $($before.Count) processes ($(@($before | Where-Object Name -eq 'node.exe').Count) node)"
$before | ForEach-Object { Format-Process $_ }
if (-not $ready) {
  Stop-Process -Id ($before.ProcessId) -Force -ErrorAction SilentlyContinue
  throw "nothing listened on port $ReadyPort within $ReadySeconds s"
}
"ready: port $ReadyPort listens"

# A separate PowerShell types the key: attaching to another console means leaving this one.
$typer = Start-Process -FilePath (Get-Process -Id $PID).Path -PassThru -Wait -NoNewWindow `
  -ArgumentList '-NoLogo', '-NoProfile', '-File', $PSCommandPath, '-TypeCtrlCInto', $shell.Id
if ($typer.ExitCode -ne 0) { throw "could not type Ctrl-C into the console of pnpm dev" }
$sent = Get-Date
"Ctrl-C typed into the console of process $($shell.Id)"

$left = $before
while (((Get-Date) - $sent).TotalSeconds -lt $StopSeconds) {
  $left = Get-Alive $before
  if ($left.Count -eq 0) { break }
  Start-Sleep -Seconds 1
}
$seconds = [math]::Round(((Get-Date) - $sent).TotalSeconds, 1)
if ($left.Count -gt 0) {
  "after Ctrl-C: $($left.Count) processes still there after $StopSeconds s:"
  $left | ForEach-Object { Format-Process $_ }
  Stop-Process -Id ($left.ProcessId) -Force -ErrorAction SilentlyContinue
}
"--- the end of pnpm dev's output ($LogFile)"
Get-Content $LogFile -Tail 25 -ErrorAction SilentlyContinue
if ($left.Count -eq 0) {
  "after Ctrl-C: nothing left after $seconds s"
  exit 0
}
"::error::One Ctrl-C did not stop pnpm dev: $($left.Count) processes were left (killed now)."
exit 1
