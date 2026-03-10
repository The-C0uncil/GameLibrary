using Microsoft.AspNetCore.Mvc;
using GameLibrary.Models;
using GameLibrary.Services;

namespace GameLibrary.Controllers;

/// <summary>
/// Handles all game management operations (list, create, edit, delete).
/// Separated from HomeController because this is an admin/management concern,
/// while HomeController owns the public-facing library view and rentals.
/// </summary>
public class GamesController : Controller
{
    private readonly GameService _gameService;
    private readonly IWebHostEnvironment _env;

    public GamesController(GameService gameService, IWebHostEnvironment env)
    {
        _gameService = gameService;
        _env = env;
    }

    private string CoversPath => Path.Combine(_env.WebRootPath, "images", "covers");

    // ── List ─────────────────────────────────────────────────────────────────

    public IActionResult Index()
    {
        var games = _gameService.GetAllGames();
        return View(games);
    }

    // ── Create ───────────────────────────────────────────────────────────────

    [HttpGet]
    public IActionResult Create()
    {
        return View(new Game());
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Create(Game game, IFormFile? coverImage)
    {
        // Handle cover image upload
        if (coverImage != null && coverImage.Length > 0)
        {
            var coverName = await SaveCoverImage(coverImage, game.TabletopGame, game.Cover);
            game.Cover = coverName;
        }

        _gameService.AddGame(game);
        return RedirectToAction(nameof(Index));
    }

    // ── Edit ─────────────────────────────────────────────────────────────────

    [HttpGet]
    public IActionResult Edit(string name)
    {
        var game = _gameService.GetAllGames()
            .FirstOrDefault(g => string.Equals(g.TabletopGame, name, StringComparison.OrdinalIgnoreCase));

        if (game == null) return NotFound();
        return View(game);
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Edit(string originalName, Game game, IFormFile? coverImage)
    {
        // Handle cover image upload
        if (coverImage != null && coverImage.Length > 0)
        {
            var coverName = await SaveCoverImage(coverImage, game.TabletopGame, game.Cover);
            game.Cover = coverName;
        }

        _gameService.UpdateGame(originalName, game);
        return RedirectToAction(nameof(Index));
    }

    // ── Delete ───────────────────────────────────────────────────────────────

    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult Delete(string name)
    {
        _gameService.DeleteGame(name);
        return RedirectToAction(nameof(Index));
    }

    // ── Cover image helper ───────────────────────────────────────────────────

    /// <summary>
    /// Saves the uploaded image to wwwroot/images/covers as a .webp-friendly name.
    /// Returns the cover field value (filename without extension).
    /// If a manual cover name is provided, uses that; otherwise slugifies the game name.
    /// </summary>
    private async Task<string> SaveCoverImage(IFormFile file, string gameName, string? manualCoverName)
    {
        Directory.CreateDirectory(CoversPath);

        // Derive the cover name: prefer explicit override, else slugify game name
        var coverName = !string.IsNullOrWhiteSpace(manualCoverName)
            ? manualCoverName.Trim()
            : Slugify(gameName);

        // Preserve the original file extension
        var ext      = Path.GetExtension(file.FileName).ToLowerInvariant();
        var fileName = coverName + ext;
        var filePath = Path.Combine(CoversPath, fileName);

        using var stream = new FileStream(filePath, FileMode.Create);
        await file.CopyToAsync(stream);

        return coverName;
    }

    private static string Slugify(string input)
    {
        if (string.IsNullOrWhiteSpace(input)) return "cover";
        return input.ToLowerInvariant()
                    .Replace(" ", "-")
                    .Replace("(", "")
                    .Replace(")", "")
                    .Replace(":", "")
                    .Replace("'", "")
                    .Replace("\"", "")
                    .Replace("/", "-")
                    .Trim('-');
    }
}