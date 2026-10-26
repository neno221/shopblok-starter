// Ours (T53, SETUP.md "Auth and account (T53)"; D64, SPEC §8.4, SBP layouts/account.md). The
// sign-in, registration and password pages' `<main>`: one narrow column with the screen's `<h1>`,
// its lead and one plain form, so each posts without scripts.
// - **Sign in:** the e-mail and the password, what led here (the address just verified, a new
//   password, a sign-out, an account page asked for) as a status above them, the way to reset a
//   password and the way to register. `next` rides in a hidden field.
// - **Register:** the e-mail, a new password (its rule under it), the name and an optional phone.
// - **Check your email:** VerificationNotice, its resend form posting the address (D64: no account
//   until the e-mail is verified).
// - **Forgot / reset:** the address the link goes to (the answer never says whether an account uses
//   it), then the new password with the link's token and address in hidden fields.
// - **Link expired:** what happened and the way to start again.
// An action's failure comes back as `errors`: a field's kind beside the field, the form's in an
// alert at the top. A server component.
import { formatMessage, type Messages } from "@shopblok/i18n";
import type { AuthPage } from "@shopblok/registry/contracts";
import { Button, buttonVariants } from "@shopblok/ui/atoms/button";
import { cn } from "@shopblok/ui/lib/utils";
import {
  VerificationNotice,
  type VerificationStatus,
} from "@shopblok/ui/molecules/verification-notice";
import NextLink from "next/link";
import type * as React from "react";
import { FormAlert, FormStatus, TextField } from "./form-parts";

// The hrefs are strings the app built; `next/link` takes whatever the app's typed routes allow.
type LinkHref = React.ComponentProps<typeof NextLink>["href"];

type FormAction = React.ComponentProps<"form">["action"];

type AuthCopy = {
  page: Messages["templates"]["auth"];
  verification: Messages["molecules"]["verificationNotice"];
};

/** The auth pages' words from a whole catalog: their own and VerificationNotice's. */
function authCopy(messages: Messages): AuthCopy {
  return {
    page: messages.templates.auth,
    verification: messages.molecules.verificationNotice,
  };
}

type AuthField = "email" | "password" | "firstName" | "lastName" | "phone";

/** What a form's action answered: the form's error, and each field's kind. */
type AuthErrors = {
  form?: keyof Messages["templates"]["auth"]["formErrors"];
  fields?: Partial<Record<AuthField, "required" | "pattern" | "invalid" | "short">>;
};

/** The shortest password the shop takes: Medusa's emailpass has no rule of its own. */
const PASSWORD_MIN = 8;

type AuthTemplateProps = AuthPage & {
  copy: AuthCopy;
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /** The screen's form's action: sign in, register, ask for a reset link or save a password. */
  action?: FormAction;
  /** The check-email screen's resend action (VerificationNotice's form). */
  resendAction?: FormAction;
  /** Where the resend is (VerificationNotice's states). */
  verificationStatus?: VerificationStatus;
  errors?: AuthErrors;
  /** next/link's `prefetch` for every link; the design system passes `false`. */
  prefetch?: boolean | null;
  /** The element's id, the skip link's target. `main` unless given. */
  mainId?: string;
  /** `div` where the page has its `<main>` already (the design system's frame). */
  as?: "main" | "div";
  className?: string;
};

const linkClass =
  "font-medium text-foreground underline underline-offset-4 outline-none hover:no-underline focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring";
// A link on a line of its own is a control, so its row is 44 px high (D32); a link inside a
// sentence keeps the sentence's line.
const ownLineLinkClass = cn(linkClass, "inline-flex min-h-11 max-w-full items-center");

function AuthTemplate({
  screen,
  copy,
  locale,
  action,
  resendAction,
  verificationStatus,
  errors = {},
  prefetch,
  mainId = "main",
  as: Root = "main",
  className,
}: AuthTemplateProps) {
  const words = copy.page;
  const fields = words.fields;
  const id = (name: string) => `${mainId}-${name}`;
  const labels: Record<AuthField, string> = {
    email: fields.email,
    password: screen.kind === "login" ? fields.password : fields.newPassword,
    firstName: fields.firstName,
    lastName: fields.lastName,
    phone: fields.phone,
  };
  const errorOf = (field: AuthField): string | undefined => {
    const kind = errors.fields?.[field];
    if (kind === undefined) return undefined;
    if (kind === "pattern") return formatMessage(words.errors.pattern, {}, locale);
    if (kind === "short") return formatMessage(words.errors.short, { min: PASSWORD_MIN }, locale);
    return formatMessage(words.errors[kind], { field: labels[field] }, locale);
  };
  const passwordHint = formatMessage(fields.passwordHint, { min: PASSWORD_MIN }, locale);
  const titles = {
    login: words.login.title,
    register: words.register.title,
    "check-email": words.checkEmail.title,
    forgot: words.forgot.title,
    reset: words.reset.title,
    "link-expired": words.linkExpired.title,
  } as const;
  const alert =
    errors.form === undefined ? null : (
      <FormAlert slot="auth-error">{words.formErrors[errors.form]}</FormAlert>
    );
  const back = (href: string, label: string) => (
    <NextLink
      href={href as LinkHref}
      prefetch={prefetch}
      data-slot="auth-back"
      className={cn(ownLineLinkClass, "self-start text-sm")}
    >
      {label}
    </NextLink>
  );
  const emailField = (value: string, autoComplete = "email") => (
    <TextField
      id={id("email")}
      name="email"
      label={labels.email}
      type="email"
      autoComplete={autoComplete}
      inputMode="email"
      spellCheck={false}
      required
      defaultValue={value}
      error={errorOf("email")}
    />
  );
  const newPassword = (
    <TextField
      id={id("password")}
      name="password"
      label={labels.password}
      type="password"
      autoComplete="new-password"
      required
      minLength={PASSWORD_MIN}
      hint={passwordHint}
      error={errorOf("password")}
    />
  );
  const form = "flex min-w-0 flex-col gap-4";
  return (
    <Root
      id={mainId}
      data-slot="auth-template"
      data-variant="default"
      data-screen={screen.kind}
      className={cn(
        "mx-auto flex w-full max-w-md min-w-0 flex-col gap-6 px-4 py-8 md:py-12",
        className,
      )}
    >
      <header className="flex min-w-0 flex-col gap-2">
        <h1 className="text-2xl leading-tight font-semibold wrap-break-word md:text-3xl">
          {titles[screen.kind]}
        </h1>
        {screen.kind === "login" ? (
          <p className="text-muted-foreground wrap-break-word">{words.login.lead}</p>
        ) : screen.kind === "register" ? (
          <p className="text-muted-foreground wrap-break-word">{words.register.lead}</p>
        ) : screen.kind === "forgot" && !screen.sent ? (
          <p className="text-muted-foreground wrap-break-word">{words.forgot.lead}</p>
        ) : screen.kind === "reset" ? (
          <p className="text-muted-foreground wrap-anywhere">
            {formatMessage(words.reset.lead, { email: screen.email }, locale)}
          </p>
        ) : null}
      </header>
      {screen.kind === "login" ? (
        <>
          {screen.notice === undefined ? null : (
            <FormStatus slot="auth-notice">{words.login.notices[screen.notice]}</FormStatus>
          )}
          {alert}
          <form
            action={action}
            method={typeof action === "function" ? undefined : "post"}
            data-slot="auth-login"
            aria-label={words.login.title}
            className={form}
          >
            {screen.next === undefined ? null : (
              <input type="hidden" name="next" value={screen.next} />
            )}
            {emailField(screen.email, "username")}
            <TextField
              id={id("password")}
              name="password"
              label={labels.password}
              type="password"
              autoComplete="current-password"
              required
              error={errorOf("password")}
            />
            <Button type="submit" size="lg" className="max-w-full">
              {words.login.submit}
            </Button>
          </form>
          <div className="flex min-w-0 flex-col gap-3 text-sm">
            <NextLink
              href={screen.forgotHref as LinkHref}
              prefetch={prefetch}
              data-slot="auth-forgot"
              className={cn(ownLineLinkClass, "self-start")}
            >
              {words.login.forgot}
            </NextLink>
            <p className="wrap-break-word">
              {words.login.noAccount}{" "}
              <NextLink
                href={screen.registerHref as LinkHref}
                prefetch={prefetch}
                data-slot="auth-register"
                className={linkClass}
              >
                {words.login.register}
              </NextLink>
            </p>
          </div>
        </>
      ) : screen.kind === "register" ? (
        <>
          {alert}
          <form
            action={action}
            method={typeof action === "function" ? undefined : "post"}
            data-slot="auth-register-form"
            aria-label={words.register.title}
            className={form}
          >
            {emailField(screen.values.email)}
            {newPassword}
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <TextField
                id={id("first-name")}
                name="firstName"
                label={labels.firstName}
                autoComplete="given-name"
                required
                defaultValue={screen.values.firstName}
                error={errorOf("firstName")}
              />
              <TextField
                id={id("last-name")}
                name="lastName"
                label={labels.lastName}
                autoComplete="family-name"
                required
                defaultValue={screen.values.lastName}
                error={errorOf("lastName")}
              />
            </div>
            <TextField
              id={id("phone")}
              name="phone"
              label={labels.phone}
              optionalLabel={fields.optional}
              type="tel"
              autoComplete="tel"
              defaultValue={screen.values.phone}
              error={errorOf("phone")}
            />
            <Button type="submit" size="lg" className="max-w-full">
              {words.register.submit}
            </Button>
          </form>
          <p className="text-sm wrap-break-word">
            {words.register.haveAccount}{" "}
            <NextLink
              href={screen.loginHref as LinkHref}
              prefetch={prefetch}
              data-slot="auth-login-link"
              className={linkClass}
            >
              {words.register.login}
            </NextLink>
          </p>
        </>
      ) : screen.kind === "check-email" ? (
        <>
          {alert}
          <VerificationNotice
            {...screen.verification}
            copy={copy.verification}
            locale={locale}
            action={resendAction}
            status={verificationStatus}
            headingLevel={2}
          />
          {back(screen.loginHref, words.checkEmail.back)}
        </>
      ) : screen.kind === "forgot" ? (
        screen.sent ? (
          <>
            <FormStatus slot="auth-sent">
              {formatMessage(words.forgot.sent, { email: screen.email }, locale)}
            </FormStatus>
            {back(screen.loginHref, words.forgot.back)}
          </>
        ) : (
          <>
            {alert}
            <form
              action={action}
              method={typeof action === "function" ? undefined : "post"}
              data-slot="auth-forgot-form"
              aria-label={words.forgot.title}
              className={form}
            >
              {emailField(screen.email)}
              <Button type="submit" size="lg" className="max-w-full">
                {words.forgot.submit}
              </Button>
            </form>
            {back(screen.loginHref, words.forgot.back)}
          </>
        )
      ) : screen.kind === "reset" ? (
        <>
          {alert}
          <form
            action={action}
            method={typeof action === "function" ? undefined : "post"}
            data-slot="auth-reset-form"
            aria-label={words.reset.title}
            className={form}
          >
            <input type="hidden" name="email" value={screen.email} />
            <input type="hidden" name="token" value={screen.token} />
            {/* The address for a password manager, which pairs it with the new password. */}
            <input
              type="email"
              autoComplete="username"
              value={screen.email}
              readOnly
              hidden
              aria-hidden="true"
              tabIndex={-1}
            />
            {newPassword}
            <Button type="submit" size="lg" className="max-w-full">
              {words.reset.submit}
            </Button>
          </form>
          {back(screen.loginHref, words.forgot.back)}
        </>
      ) : (
        <>
          <p className="wrap-break-word">{words.linkExpired[screen.link]}</p>
          <NextLink
            href={screen.restartHref as LinkHref}
            prefetch={prefetch}
            data-slot="auth-restart"
            className={cn(buttonVariants({ size: "lg" }), "max-w-full self-start")}
          >
            {words.linkExpired.restart[screen.link]}
          </NextLink>
        </>
      )}
    </Root>
  );
}

export { AuthTemplate, authCopy, PASSWORD_MIN };
export type { AuthCopy, AuthErrors, AuthField, AuthTemplateProps };
