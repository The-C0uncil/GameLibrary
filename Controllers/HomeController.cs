using GameLibrary.Models;
using GameLibrary.Services;
using Microsoft.AspNetCore.Mvc;

namespace GameLibrary.Controllers
{
    public class HomeController : Controller
    {
        private readonly GameService _gameService;
        private readonly EmailService _emailService;

        public HomeController(GameService gameService, EmailService emailService)
        {
            _gameService = gameService;
            _emailService = emailService;
        }

        public IActionResult Index()
        {
            var games = _gameService.GetAllGames();
            return View(games);
        }

        [HttpPost]
        public async Task<IActionResult> SubmitContactForm([FromBody] ContactForm form)
        {
            try
            {
                await _emailService.SendContactFormEmail(form);
                return Ok(new { success = true, message = "Form submitted successfully!" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Error: {ex.Message}" });
            }
        }
    }
}
