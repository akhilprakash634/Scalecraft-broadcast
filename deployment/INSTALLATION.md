# ScaleCraft Broadcast - Deployment & Installation Guide

This guide details the exact deployment process to launch an isolated, single-tenant installation of ScaleCraft Broadcast for an individual business.

---

### Prerequisites
- GitHub Account
- Vercel Account
- Supabase Account
- Meta Developer Account (for WhatsApp Business Cloud API)

---

## STEP 1: Create Client GitHub Repository
Create a new private repository under the client's GitHub account (or your organization, provisioned for the client).

## STEP 2: Copy/Fork ScaleCraft Repository
Clone the main ScaleCraft repository and push the code directly to the client's new private repository. Do not use a fork if you want to completely isolate the commit history, or use a fork if you prefer to pull updates easily.

## STEP 3: Create Client Supabase Project
Log in to Supabase and create a new project. 
Make note of the **Project URL**, **Anon Key**, and **Service Role Key** (found under Project Settings -> API).

## STEP 4: Open Supabase SQL Editor
In the new Supabase project, navigate to the **SQL Editor** on the left sidebar.

## STEP 5: Run Installation SQL
Copy the entire contents of `database/install.sql` and run it in the SQL Editor. 
This will provision the database with the exact schema needed for the application.

## STEP 6: Create the Initial Administrator Securely
In Supabase, navigate to **Authentication -> Users**.
Click **Add User** -> **Create New User**.
Enter the administrator's email and generate a strong, secure, random password. 
*(Do NOT use simple passwords, and do NOT commit this password anywhere in the repository).*

## STEP 6b: Create the Business Profile Row
In the Supabase SQL Editor, run the following command to create the initial business profile container (replace with your business name and real WhatsApp number):
```sql
INSERT INTO public.agent_clients (business_name, whatsapp_bot_number)
VALUES ('My Business Name', '9876543210');
```
*Note: When you log in for the first time using the email from Step 6, the system will automatically detect this row and link it to your admin email securely.*

## STEP 7: Create Vercel Project
Log in to Vercel and click **Add New -> Project**.

## STEP 8: Connect GitHub Repository
Select the client's GitHub repository that you created in Step 1.

## STEP 9: Configure Environment Variables
Before deploying, configure the following Environment Variables in Vercel based on the `.env.example` template:

- `NEXT_PUBLIC_APP_URL` (The final domain, e.g., https://chat.client.com)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_SECRET` (Generate a random secure string)
- `JWT_SECRET` (Generate a random secure string)
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN` (Create a custom secure string, e.g., `my_secure_webhook_token_123`)

## STEP 10: Deploy
Click **Deploy** in Vercel. Wait for the build to complete successfully.

## STEP 11: Connect Client Domain
In Vercel, navigate to the project's **Settings -> Domains** and add the client's custom domain (e.g., `chat.clientbusiness.com`). Update DNS records as instructed by Vercel.

## STEP 12: Configure WhatsApp Cloud API
1. Go to the Meta App Dashboard.
2. Add the **WhatsApp** product.
3. Generate a permanent Access Token (using a System User in Business Manager).
4. Identify the **Phone Number ID** and **WhatsApp Business Account ID (WABA)**.
5. Log into your deployed ScaleCraft dashboard using the admin credentials created in Step 6.
6. Navigate to **Settings** and enter the Access Token, Phone Number ID, and WABA ID.

## STEP 13: Configure Meta Webhook
In the Meta App Dashboard, under **WhatsApp -> Configuration**:
1. Click **Edit** next to Webhook.
2. Callback URL: `https://[YOUR_DOMAIN]/api/webhooks/whatsapp-cloud`
3. Verify Token: Enter the exact string you used for `WHATSAPP_WEBHOOK_VERIFY_TOKEN` in Vercel.
4. Manage Webhook Fields: Subscribe to **messages**.

## STEP 14: Configure Flow Endpoint (If Required)
If the client will use WhatsApp Flows:
1. Generate an RSA keypair.
2. Add the private key to Vercel as `WHATSAPP_FLOW_PRIVATE_KEY` (use literal `\n` for line breaks).
3. In Meta Dashboard, configure the Flow Endpoint to `https://[YOUR_DOMAIN]/api/webhooks/whatsapp-flows`.

## STEP 15: Test Incoming WhatsApp Message
Send a message from your personal WhatsApp to the client's WhatsApp Business number.
Verify that it appears instantly in the **Inbox** tab of the dashboard.

## STEP 16: Test Outgoing Message
Reply to the message from the dashboard. Verify it arrives on your phone.

## STEP 17: Test Broadcast
1. Ensure you have an approved Message Template in Meta.
2. Go to **Broadcast** -> **Create Campaign**.
3. Select the template and send it to your test number.

## STEP 18: Test Delivery Status
Verify that the broadcast message status changes to *Sent*, *Delivered*, and *Read* as you view it on your phone.

## STEP 19: Test Flow
If flows are configured, trigger a flow and verify the submission appears in the dashboard/database.

## STEP 20: Deliver Login Credentials to Client
Once all tests pass, securely transmit the following to the client:
- Production URL (e.g., `https://chat.clientbusiness.com`)
- Admin Email
- Temporary Password

*Note: Instruct the client to immediately log in and change their password, and optionally configure Authenticator (MFA) if supported in Supabase Auth.*
