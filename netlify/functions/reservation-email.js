const sendEmail = require('./utils/send-email');

function formatDate(value) {
    if (!value) return '—';

    try {
        const [year, month, day] = value.split('-').map(Number);
        if (!year || !month || !day) return value;

        const date = new Date(Date.UTC(year, month - 1, day));
        return new Intl.DateTimeFormat('de-AT', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        }).format(date);
    } catch (error) {
        console.error('Failed to format date', error);
        return value;
    }
}

function escapeHtml(value = '') {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatSpecialRequests(message) {
    if (!message) {
        return '<span style="opacity:0.65;">Keine besonderen Wünsche angegeben.</span>';
    }

    const escaped = escapeHtml(message).replace(/\r?\n/g, '<br>');
    return `"${escaped}"`;
}

function buildDetailCard(label, value) {
    return `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px; padding:18px 22px; margin-bottom:14px; border-radius:16px; border:1px solid #f0dfd1; background:linear-gradient(135deg, rgba(248,240,232,0.75), rgba(255,255,255,0.95));">
            <div style="font-size:11px; letter-spacing:0.14em; text-transform:uppercase; color:#a4806b; font-weight:600;">${label}</div>
            <div style="font-size:16px; color:#3f2a1f; font-weight:600; text-align:right;">${value}</div>
        </div>
    `;
}

function buildHtmlEmail(data) {
    const formattedDate = formatDate(data.date);
    const guestsText = data.guests ? `${escapeHtml(data.guests)} ${data.guests === '1' ? 'Person' : 'Personen'}` : '—';
    const contactPhone = data.phone ? `<a href="tel:${encodeURIComponent(data.phone)}" style="color:#e26c8b; text-decoration:none; font-weight:600;">${escapeHtml(data.phone)}</a>` : '<span style="opacity:0.65;">Keine Telefonnummer angegeben</span>';
    const contactEmail = data.email ? `<a href="mailto:${escapeHtml(data.email)}" style="color:#e26c8b; text-decoration:none; font-weight:600;">${escapeHtml(data.email)}</a>` : '—';

    const specialRequests = data.message && data.message.trim().length > 0
        ? `
            <div style="margin-top:30px; padding:26px 28px; border-radius:20px; background:linear-gradient(135deg, rgba(226,108,139,0.1), rgba(244,197,164,0.18)); border:1px solid rgba(226,108,139,0.35);">
                <div style="font-size:13px; letter-spacing:0.16em; text-transform:uppercase; color:#c17c6d; font-weight:700; margin-bottom:12px;">Besondere Wünsche</div>
                <div style="font-size:16px; line-height:1.7; color:#4b3529; font-weight:500;">${formatSpecialRequests(data.message)}</div>
            </div>
        `
        : `
            <div style="margin-top:30px; padding:24px 28px; border-radius:20px; background:rgba(247, 241, 235, 0.9); border:1px dashed rgba(206, 176, 152, 0.6);">
                <div style="font-size:13px; letter-spacing:0.16em; text-transform:uppercase; color:#b68d75; font-weight:700; margin-bottom:10px;">Besondere Wünsche</div>
                <div style="font-size:15px; line-height:1.7; color:#6c5242;">Keine besonderen Wünsche angegeben.</div>
            </div>
        `;

    const detailCards = [
        buildDetailCard('Datum', escapeHtml(formattedDate)),
        buildDetailCard('Uhrzeit', escapeHtml(data.time || '—')),
        buildDetailCard('Personenanzahl', guestsText),
        buildDetailCard('Name der Reservierung', escapeHtml(data.name || '—'))
    ].join('');

    const replySubject = encodeURIComponent(`Reservierung Healthy Brunch Club – ${formattedDate}`);
    const replyBody = encodeURIComponent(`Liebe/r ${data.name || ''},\n\nherzlichen Dank für Ihre Reservierungsanfrage.\n\nBeste Grüße\nHealthy Brunch Club Team`);

    return `
        <div style="width:100%; background:#f9f6f1; padding:40px 20px; font-family:'Helvetica Neue', Arial, sans-serif;">
            <div style="max-width:640px; margin:0 auto; background:#ffffff; border-radius:22px; overflow:hidden; box-shadow:0 35px 70px rgba(67, 41, 32, 0.18); border:1px solid rgba(237, 221, 207, 0.8);">
                <div style="background:linear-gradient(120deg, #f7b58d, #e46d8c); color:#fff; padding:34px 42px;">
                    <div style="letter-spacing:0.36em; text-transform:uppercase; font-size:12px; font-weight:700; opacity:0.85;">Neue Reservierung</div>
                    <h1 style="margin:10px 0 0; font-size:28px; font-weight:700; letter-spacing:0.04em;">${escapeHtml(data.name || 'Unbekannter Gast')}</h1>
                    <p style="margin:12px 0 0; font-size:16px; opacity:0.85;">${escapeHtml(formattedDate)} &middot; ${escapeHtml(data.time || 'Zeit offen')}</p>
                </div>

                <div style="padding:36px 42px; background:linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(252,247,242,0.9) 100%);">
                    <p style="margin:0 0 18px; font-size:16px; color:#4c372a;">Hallo liebes Healthy Brunch Club Team,</p>
                    <p style="margin:0 0 28px; font-size:15px; line-height:1.7; color:#6d5241;">es ist soeben eine neue Reservierungsanfrage eingetroffen. Im Folgenden finden Sie alle Details übersichtlich zusammengefasst.</p>

                    ${detailCards}

                    ${specialRequests}

                    <div style="margin-top:32px; padding:26px 28px; border-radius:20px; background:rgba(255,255,255,0.75); border:1px solid rgba(226, 200, 182, 0.6); display:flex; flex-direction:column; gap:8px;">
                        <div style="font-size:13px; letter-spacing:0.16em; text-transform:uppercase; color:#b68d75; font-weight:700;">Kontakt</div>
                        <div style="font-size:16px; color:#3f2a1f; font-weight:600;">${escapeHtml(data.name || 'Unbekannt')}</div>
                        <div style="font-size:15px; color:#6f5546;">${contactEmail}</div>
                        <div style="font-size:15px; color:#6f5546;">${contactPhone}</div>
                    </div>

                    <div style="margin-top:32px; text-align:center;">
                        <a href="mailto:${escapeHtml(data.email || '')}?subject=${replySubject}&body=${replyBody}" style="display:inline-block; padding:14px 28px; border-radius:999px; background:linear-gradient(120deg, #f7b58d, #e46d8c); color:#fff; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; text-decoration:none; box-shadow:0 12px 30px rgba(228,109,140,0.35);">Direkt antworten</a>
                    </div>
                </div>

                <div style="background:rgba(244, 236, 229, 0.9); padding:22px 32px; text-align:center; color:#866956; font-size:13px; letter-spacing:0.08em; text-transform:uppercase;">
                    <strong style="display:block; font-size:14px; margin-bottom:6px; letter-spacing:0.18em;">Healthy Brunch Club Wien</strong>
                    <span style="display:block; letter-spacing:0.12em;">Sonniger Genuss &middot; Wohlfühlatmosphäre &middot; Kreative Küche</span>
                    <span style="display:block; margin-top:12px; letter-spacing:0.14em;">
                        <a href="mailto:hello@healthybrunchclub.at" style="color:#866956; font-weight:600; text-decoration:none;">hello@healthybrunchclub.at</a>
                    </span>
                </div>
            </div>
        </div>
    `;
}

function buildTextEmail(data) {
    const formattedDate = formatDate(data.date);
    const guestsText = data.guests ? `${data.guests} ${data.guests === '1' ? 'Person' : 'Personen'}` : '—';
    const special = data.message && data.message.trim().length > 0
        ? `\nBesondere Wünsche:\n${data.message.trim()}\n`
        : '\nBesondere Wünsche: Keine Angaben\n';

    return [
        'Neue Reservierungsanfrage',
        '===========================',
        `Name: ${data.name || '—'}`,
        `E-Mail: ${data.email || '—'}`,
        `Telefon: ${data.phone || '—'}`,
        `Datum: ${formattedDate}`,
        `Uhrzeit: ${data.time || '—'}`,
        `Personen: ${guestsText}`,
        special,
        'Antworten Sie gerne direkt auf diese E-Mail, um mit dem Gast in Kontakt zu treten.',
        '',
        'Healthy Brunch Club Wien'
    ].join('\n');
}

exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: { 'Allow': 'POST' },
            body: JSON.stringify({ message: 'Method not allowed' })
        };
    }

    const toRecipients = process.env.BOOKING_NOTIFICATION_TO
        || process.env.RESTAURANT_EMAIL
        || '';
    const fromAddress = process.env.BOOKING_NOTIFICATION_FROM
        || process.env.SENDER_EMAIL
        || 'Healthy Brunch Club <noreply@healthybrunchclub.at>';

    let payload;
    try {
        payload = JSON.parse(event.body || '{}');
    } catch (error) {
        console.error('Failed to parse request body', error);
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Ungültige Daten übermittelt.' })
        };
    }

    const requiredFields = ['name', 'email', 'date', 'time', 'guests'];
    const missingFields = requiredFields.filter(field => !payload[field] || String(payload[field]).trim() === '');

    if (missingFields.length > 0) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Bitte füllen Sie alle Pflichtfelder aus.',
                missing: missingFields
            })
        };
    }

    try {
        const html = buildHtmlEmail(payload);
        const text = buildTextEmail(payload);
        const recipients = toRecipients.split(',').map(address => address.trim()).filter(Boolean);

        if (recipients.length === 0) {
            console.error('No valid recipients configured for reservation notifications');
            return {
                statusCode: 500,
                body: JSON.stringify({ message: 'E-Mail Versand nicht konfiguriert (Empfänger fehlt).' })
            };
        }

        await Promise.all(
            recipients.map((recipient) =>
                sendEmail({
                    to: recipient,
                    from: fromAddress,
                    subject: `Neue Reservierung • ${formatDate(payload.date)} • ${payload.time}`,
                    html,
                    text,
                    replyTo: payload.email || undefined
                })
            )
        );

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'E-Mail erfolgreich versendet.' })
        };
    } catch (error) {
        console.error('Failed to send reservation email', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Beim Senden der E-Mail ist ein Fehler aufgetreten.' })
        };
    }
};
