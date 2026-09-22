// Daily due-soon email. Invoked by pg_cron via pg_net, not by the browser.
//
// Scope is email only. Push notifications need a service worker and stored
// Web Push subscriptions, which is a materially larger piece of
// infrastructure and a separate phase.
//
// Nothing is sent to a workspace that has not switched alerts on. The column
// defaults to false, so the quiet path is the default path.

import { corsHeaders, json, fail, serviceClient } from '../_shared/http.ts'
import { commitmentsDueWithin, buildAlertEmail } from '../_shared/alerts.js'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const resendKey = Deno.env.get('RESEND_API_KEY')
    const fromAddress = Deno.env.get('ALERT_FROM_ADDRESS')
    if (!resendKey || !fromAddress) {
      return fail(
        'send-alerts: RESEND_API_KEY / ALERT_FROM_ADDRESS not set',
        'Alerts are not configured yet.',
        503,
      )
    }

    const appUrl = Deno.env.get('APP_URL') ?? ''
    const db = serviceClient()

    // Only members who asked for this.
    const { data: members, error: membersError } = await db
      .from('workspace_members')
      .select('workspace_id, user_id')
      .eq('email_alerts_enabled', true)

    if (membersError) return fail(`send-alerts: ${membersError.message}`, 'Could not read members.', 500)

    let sent = 0
    let skipped = 0
    const failures: string[] = []

    for (const member of members ?? []) {
      const { data: commitments, error } = await db
        .from('commitments')
        .select('name, status, cost_per_payment, next_payment_date')
        .eq('workspace_id', member.workspace_id)

      if (error) {
        failures.push(`workspace ${member.workspace_id}: ${error.message}`)
        continue
      }

      const due = commitmentsDueWithin(commitments ?? [])
      const email = buildAlertEmail(due, { appUrl })

      // buildAlertEmail returns null for an empty list, so a quiet day sends
      // nothing at all rather than an email saying nothing is due.
      if (!email) {
        skipped += 1
        continue
      }

      const { data: userData, error: userError } = await db.auth.admin.getUserById(member.user_id)
      if (userError || !userData?.user?.email) {
        failures.push(`user ${member.user_id}: no email address`)
        continue
      }

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: fromAddress,
          to: userData.user.email,
          subject: email.subject,
          text: email.text,
        }),
      })

      if (!res.ok) {
        // One workspace failing must not stop the rest of the run.
        failures.push(`send to ${member.user_id}: HTTP ${res.status} ${await res.text()}`)
        continue
      }

      sent += 1
    }

    if (failures.length > 0) console.error(`send-alerts: ${failures.length} failure(s):\n${failures.join('\n')}`)

    return json({ sent, skipped, failed: failures.length })
  } catch (err) {
    return fail(`send-alerts: ${err}`, 'Alert run failed.', 500)
  }
})
