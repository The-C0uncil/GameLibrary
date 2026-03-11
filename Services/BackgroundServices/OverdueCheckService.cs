using GameLibrary.Services;

namespace GameLibrary.BackgroundServices;

/// <summary>
/// Runs daily at 08:00 and sends a reminder email for every open order
/// whose end date is tomorrow.
/// Register in Program.cs:
///   builder.Services.AddHostedService&lt;OverdueCheckService&gt;();
/// </summary>
public class OverdueCheckService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<OverdueCheckService> _logger;

    public OverdueCheckService(IServiceScopeFactory scopeFactory,
                                ILogger<OverdueCheckService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var delay = TimeUntilNext8Am();
            _logger.LogInformation("OverdueCheckService sleeping for {Delay}", delay);
            await Task.Delay(delay, stoppingToken);

            if (stoppingToken.IsCancellationRequested) break;

            await RunCheckAsync();
        }
    }

    private async Task RunCheckAsync()
    {
        try
        {
            // Use a scope because GameService and EmailService are scoped/transient
            using var scope = _scopeFactory.CreateScope();
            var gameService = scope.ServiceProvider.GetRequiredService<GameService>();
            var emailService = scope.ServiceProvider.GetRequiredService<EmailService>();

            var ordersDueTomorrow = gameService.GetOrdersDueTomorrow();
            if (!ordersDueTomorrow.Any())
            {
                _logger.LogInformation("OverdueCheckService: no orders due tomorrow.");
                return;
            }

            var allGames = gameService.GetAllGames();
            var gameMap = allGames.ToDictionary(g => g.Id, g => g.TabletopGame);

            foreach (var order in ordersDueTomorrow)
            {
                var gameNames = order.ParsedGameIds
                    .Select(id => gameMap.TryGetValue(id, out var name) ? name : $"Game #{id}")
                    .ToList();

                await emailService.SendOverdueReminderEmail(order, gameNames);
                _logger.LogInformation(
                    "OverdueCheckService: reminder sent for order #{OrderId} ({Renter})",
                    order.Id, order.Renter);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "OverdueCheckService: error during check.");
        }
    }

    /// <summary>
    /// Calculates how long to wait until the next 08:00 local time.
    /// </summary>
    private static TimeSpan TimeUntilNext8Am()
    {
        var now = DateTime.Now;
        var next8 = now.Date.AddHours(8);
        if (now >= next8) next8 = next8.AddDays(1);
        return next8 - now;
    }
}