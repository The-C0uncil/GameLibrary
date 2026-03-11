using GameLibrary.Models;
using System.Net;
using System.Net.Mail;

namespace GameLibrary.Services
{
    public class EmailService
    {
        private readonly IConfiguration _configuration;

        public EmailService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        // ── Contact form ───────────────────────────────────────────

        public async Task SendContactFormEmail(ContactForm form)
        {
            var smtpServer     = _configuration["Email:SmtpServer"] ?? "smtp.gmail.com";
            var smtpPort       = int.Parse(_configuration["Email:SmtpPort"] ?? "587");
            var smtpUsername   = _configuration["Email:Username"] ?? "";
            var smtpPassword   = _configuration["Email:Password"] ?? "";
            var recipientEmail = _configuration["Email:RecipientEmail"] ?? "";

            var mailMessage = new MailMessage
            {
                From       = new MailAddress(smtpUsername),
                Subject    = "New Game Library Contact Form Submission",
                Body       = BuildContactEmailBody(form),
                IsBodyHtml = true
            };

            mailMessage.To.Add(recipientEmail);

            using var smtpClient = new SmtpClient(smtpServer, smtpPort)
            {
                EnableSsl   = true,
                Credentials = new NetworkCredential(smtpUsername, smtpPassword)
            };

            await smtpClient.SendMailAsync(mailMessage);
        }

        // ── Overdue reminder ──────────────────────────────────────────────────

        /// <summary>
        /// Sends a reminder email for a rental order that is due tomorrow.
        /// Called daily at 8am by OverdueCheckService.
        /// </summary>
        public async Task SendOverdueReminderEmail(RentalRecord order, List<string> gameNames)
        {
            var smtpServer     = _configuration["Email:SmtpServer"] ?? "smtp.gmail.com";
            var smtpPort       = int.Parse(_configuration["Email:SmtpPort"] ?? "587");
            var smtpUsername   = _configuration["Email:Username"] ?? "";
            var smtpPassword   = _configuration["Email:Password"] ?? "";
            var recipientEmail = _configuration["Email:RecipientEmail"] ?? "";

            var mailMessage = new MailMessage
            {
                From       = new MailAddress(smtpUsername),
                Subject    = $"⏰ Rental Due Tomorrow — Order #{order.Id} ({order.Renter})",
                Body       = BuildReminderEmailBody(order, gameNames),
                IsBodyHtml = true
            };

            mailMessage.To.Add(recipientEmail);

            using var smtpClient = new SmtpClient(smtpServer, smtpPort)
            {
                EnableSsl   = true,
                Credentials = new NetworkCredential(smtpUsername, smtpPassword)
            };

            await smtpClient.SendMailAsync(mailMessage);
        }

        // ── Email body builders ───────────────────────────────────────────────

        private static string BuildContactEmailBody(ContactForm form)
        {
            var body = $@"
                <h2>New Contact Form Submission</h2>
                <p><strong>Name:</strong> {form.Name}</p>
                <p><strong>Phone:</strong> {form.PhoneNumber}</p>
                <p><strong>Email:</strong> {form.Email}</p>
                <p><strong>Address:</strong> {form.Address}</p>
                <h3>Selected Games:</h3>
                <ul>";

            foreach (var game in form.SelectedGames)
                body += $"<li>{game}</li>";

            body += "</ul>";
            return body;
        }

        private static string BuildReminderEmailBody(RentalRecord order, List<string> gameNames)
        {
            var gameList = string.Join("", gameNames.Select(g => $"<li>{g}</li>"));

            return $@"
                <h2>Rental Due Tomorrow</h2>
                <p>The following order is due back <strong>tomorrow ({order.EndDate})</strong>.</p>
                <table style='border-collapse:collapse;font-family:sans-serif;font-size:14px'>
                    <tr>
                        <td style='padding:4px 12px 4px 0;color:#888'>Order ID</td>
                        <td><strong>#{order.Id}</strong></td>
                    </tr>
                    <tr>
                        <td style='padding:4px 12px 4px 0;color:#888'>Renter</td>
                        <td>{order.Renter}</td>
                    </tr>
                    <tr>
                        <td style='padding:4px 12px 4px 0;color:#888'>Phone</td>
                        <td>{order.PhoneNumber}</td>
                    </tr>
                    <tr>
                        <td style='padding:4px 12px 4px 0;color:#888'>Rental Period</td>
                        <td>{order.StartDate} → {order.EndDate}</td>
                    </tr>
                </table>
                <h3 style='margin-top:20px'>Games</h3>
                <ul>{gameList}</ul>";
        }
    }
}