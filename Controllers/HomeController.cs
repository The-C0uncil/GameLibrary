using GameLibrary.Models;
using GameLibrary.Services;
using Microsoft.AspNetCore.Mvc;

namespace GameLibrary.Controllers
{
    public class HomeController : Controller
    {
        private readonly ILogger<HomeController> _logger;
        private readonly GameService _gameService;
        private readonly EmailService _emailService;

        public HomeController(ILogger<HomeController> logger, GameService gameService, EmailService emailService)
        {
            _logger = logger;
            _gameService = gameService;
            _emailService = emailService;
        }

        public IActionResult Index()
        {
            var games = _gameService.GetAllGames();
            ViewBag.OpenRentals = _gameService.GetOpenRentals();
            return View(games);
        }

        [HttpPost]
        public IActionResult SubmitRental([FromBody] RentalRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.RenterName) ||
                    string.IsNullOrWhiteSpace(request.StartDate) ||
                    string.IsNullOrWhiteSpace(request.EndDate) ||
                    request.Games == null || request.Games.Count == 0)
                {
                    return Json(new { success = false, message = "Missing required fields." });
                }

                _gameService.AppendRentals(request);

                foreach (var game in request.Games)
                    _gameService.SetGameAvailability(game, available: false);

                return Json(new { success = true });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public IActionResult ReceiveGame([FromBody] ReceiveGameRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.GameName))
                    return Json(new { success = false, message = "Game name required." });

                _gameService.MarkReceived(request.GameName);
                _gameService.SetGameAvailability(request.GameName, available: true);

                return Json(new { success = true });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        public IActionResult RentalHistory()
        {
            var history = _gameService.GetRentalHistory();
            return View(history);
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
