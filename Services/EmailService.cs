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

        public async Task SendContactFormEmail(ContactForm form)
        {
            var smtpServer = _configuration["Email:SmtpServer"] ?? "smtp.gmail.com";
            var smtpPort = int.Parse(_configuration["Email:SmtpPort"] ?? "587");
            var smtpUsername = _configuration["Email:Username"] ?? "";
            var smtpPassword = _configuration["Email:Password"] ?? "";
            var recipientEmail = _configuration["Email:RecipientEmail"] ?? "";

            var mailMessage = new MailMessage
            {
                From = new MailAddress(smtpUsername),
                Subject = "New Game Library Contact Form Submission",
                Body = BuildEmailBody(form),
                IsBodyHtml = true
            };

            mailMessage.To.Add(recipientEmail);

            using var smtpClient = new SmtpClient(smtpServer, smtpPort)
            {
                EnableSsl = true,
                Credentials = new NetworkCredential(smtpUsername, smtpPassword)
            };

            await smtpClient.SendMailAsync(mailMessage);
        }

        private string BuildEmailBody(ContactForm form)
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
            {
                body += $"<li>{game}</li>";
            }

            body += "</ul>";

            return body;
        }
    }
}
