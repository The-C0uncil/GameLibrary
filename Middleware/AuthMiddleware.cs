namespace GameLibrary.Middleware;

public class AuthMiddleware
{
    private readonly RequestDelegate _next;

    public AuthMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path.Value ?? "";

        // Always allow the login page and its POST through
        if (path.StartsWith("/Login", StringComparison.OrdinalIgnoreCase))
        {
            await _next(context);
            return;
        }

        // Check session
        var authenticated = context.Session.GetString("authenticated");
        if (authenticated != "true")
        {
            // Preserve the original destination so we can redirect back after login
            var returnUrl = Uri.EscapeDataString(context.Request.Path + context.Request.QueryString);
            context.Response.Redirect($"/Login?returnUrl={returnUrl}");
            return;
        }

        await _next(context);
    }
}