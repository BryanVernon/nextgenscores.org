# Administrator access

Existing accounts with the `admin` role keep access. Signup, login, and session
checks no longer grant administrator access from an email address alone, because
the public signup form does not verify ownership of that address.

To provision an administrator, a trusted server operator must:

1. Confirm ownership of the intended existing account through a trusted channel.
2. Add its email address to the server's `ADMIN_EMAILS` configuration.
3. From the backend directory in the trusted server environment, run:

   ```text
   npm run admin:promote -- account@example.com
   ```

The command updates only an existing, allowlisted account. It never creates an
account. Never run it for an address merely because it appears in a signup request.
The administrator can then sign in or reload their current session.
