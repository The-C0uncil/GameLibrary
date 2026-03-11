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
            var openRentals = _gameService.GetOpenRentalsByGameId();
            ViewBag.OpenRentals = openRentals;
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

                var orderId = _gameService.AppendRental(request);

                foreach (var gameId in request.Games)
                    _gameService.SetGameAvailability(gameId, available: false);

                return Json(new { success = true, orderId });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public IActionResult ReceiveOrder([FromBody] ReceiveGameRequest request)
        {
            try
            {
                var order = _gameService.GetAllRentals()
                    .FirstOrDefault(r => r.Id == request.GameId);

                if (order == null)
                    return Json(new { success = false, message = "Order not found." });

                _gameService.MarkOrderReceived(request.GameId);

                foreach (var gameId in order.ParsedGameIds)
                    _gameService.SetGameAvailability(gameId, available: true);

                return Json(new { success = true });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        public IActionResult RentalHistory()
        {
            var rentals = _gameService.GetAllRentals();
            var games = _gameService.GetAllGames();

            // Build a simple string→string dict that survives ViewBag without cast issues
            var gameNameById = games.ToDictionary(
                g => g.Id.ToString(),
                g => g.TabletopGame
            );

            // Pre-resolve names for every order so the view never needs a lookup
            var orderGameNames = rentals.ToDictionary(
                r => r.Id,
                r => r.ParsedGameIds
                        .Select(id => gameNameById.TryGetValue(id.ToString(), out var n) ? n : $"#{id}")
                        .ToList()
            );

            ViewBag.OrderGameNames = orderGameNames;
            return View(rentals);
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
