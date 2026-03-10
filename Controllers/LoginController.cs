using Microsoft.AspNetCore.Mvc;

namespace GameLibrary.Controllers;

public class LoginController : Controller
{
    private readonly IConfiguration _config;

    public LoginController(IConfiguration config)
    {
        _config = config;
    }

    [HttpGet("/Login")]
    public IActionResult Index(string? returnUrl)
    {
        if (HttpContext.Session.GetString("authenticated") == "true")
            return Redirect(returnUrl ?? "/");

        ViewBag.ReturnUrl = returnUrl;
        return View();
    }

    [HttpPost("/Login")]
    [ValidateAntiForgeryToken]
    public IActionResult Index(string username, string password, string? returnUrl)
    {
        var validUser = _config["APP_USERNAME"] ?? "admin";
        var validPass = _config["APP_PASSWORD"] ?? "changeme";

        if (username == validUser && password == validPass)
        {
            HttpContext.Session.SetString("authenticated", "true");
            return Redirect(returnUrl ?? "/");
        }

        ViewBag.ReturnUrl = returnUrl;
        ViewBag.Error = "Invalid username or password.";
        return View();
    }

    [HttpPost("/Logout")]
    [ValidateAntiForgeryToken]
    public IActionResult Logout()
    {
        HttpContext.Session.Clear();
        return RedirectToAction("Index");
    }
}