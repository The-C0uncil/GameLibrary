using System.Globalization;
using CsvHelper;
using CsvHelper.Configuration;
using GameLibrary.Models;

namespace GameLibrary.Services;

public class GameService
{
    private readonly string _gameListPath;
    private readonly string _rentalsPath;

    private static readonly CsvConfiguration CsvConfig = new(CultureInfo.InvariantCulture)
    {
        HeaderValidated = null,
        MissingFieldFound = null
    };

    // Rentals CSV columns:
    // Id, Renter, Start Date, End Date, Phone Number, Recorded At, Received Date, Game Ids
    private static readonly string RentalsHeader =
        "Id,Renter,Start Date,End Date,Phone Number,Recorded At,Received Date,Game Ids,Rental Price";

    public GameService(IWebHostEnvironment env)
    {
        var dataDir   = Path.Combine(env.ContentRootPath, "Data");
        _gameListPath = Path.Combine(dataDir, "game_list.csv");
        _rentalsPath  = Path.Combine(dataDir, "rentals.csv");
    }

    // ════════════════════════════════════════
    //  Game list
    // ════════════════════════════════════════

    public List<Game> GetAllGames()
    {
        if (!File.Exists(_gameListPath)) return [];
        using var reader = new StreamReader(_gameListPath);
        using var csv    = new CsvReader(reader, CsvConfig);
        csv.Context.RegisterClassMap<GameMap>();
        var games = csv.GetRecords<Game>().ToList();

        // If the CSV has no Id column (all zeros), assign stable positional IDs
        // and write them back so future reads are consistent.
        if (games.Count > 0 && games.All(g => g.Id == 0))
        {
            for (int i = 0; i < games.Count; i++)
                games[i].Id = i + 1;
            WriteAllGames(games);
        }

        return games;
    }

    public void AddGame(Game game)
    {
        var games  = GetAllGames();
        game.Id    = games.Count > 0 ? games.Max(g => g.Id) + 1 : 1;
        games.Add(game);
        WriteAllGames(games);
    }

    public bool UpdateGame(string originalName, Game updated)
    {
        var games = GetAllGames();
        var index = games.FindIndex(g =>
            string.Equals(g.TabletopGame, originalName, StringComparison.OrdinalIgnoreCase));
        if (index < 0) return false;
        updated.Id   = games[index].Id; // preserve ID
        games[index] = updated;
        WriteAllGames(games);
        return true;
    }

    public bool DeleteGame(string name)
    {
        var games   = GetAllGames();
        var removed = games.RemoveAll(g =>
            string.Equals(g.TabletopGame, name, StringComparison.OrdinalIgnoreCase));
        if (removed == 0) return false;
        WriteAllGames(games);
        return true;
    }

    public bool SetGameAvailability(int gameId, bool available)
    {
        var games = GetAllGames();
        var game  = games.FirstOrDefault(g => g.Id == gameId);
        if (game == null) return false;
        game.Availability = available;
        WriteAllGames(games);
        return true;
    }

    private void WriteAllGames(List<Game> games)
    {
        EnsureDirectory(_gameListPath);
        using var writer = new StreamWriter(_gameListPath, append: false, System.Text.Encoding.UTF8);
        using var csv    = new CsvWriter(writer, CsvConfig);
        csv.Context.RegisterClassMap<GameMap>();
        csv.WriteRecords(games);
    }

    // ════════════════════════════════════════
    //  Rentals — one row per order
    // ════════════════════════════════════════

    /// <summary>
    /// Appends a single order row. Game IDs stored as semicolon-separated ints.
    /// </summary>
    public int AppendRental(RentalRequest request)
    {
        EnsureDirectory(_rentalsPath);
        var timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
        bool exists   = File.Exists(_rentalsPath);
        var  orderId  = GetNextRentalId();
        var  gameIds  = string.Join(";", request.Games);

        using var writer = new StreamWriter(_rentalsPath, append: true, System.Text.Encoding.UTF8);
        if (!exists) writer.WriteLine(RentalsHeader);

        writer.WriteLine(string.Join(",", new[]
        {
            orderId.ToString(),
            Csv(request.RenterName),
            Csv(request.StartDate),
            Csv(request.EndDate),
            Csv(request.PhoneNumber),
            Csv(timestamp),
            "",        // Received Date — blank until returned
            Csv(gameIds),
            request.RentalPrice.ToString("F2", CultureInfo.InvariantCulture)
        }));

        return orderId;
    }

    /// <summary>
    /// Marks an order as received by writing today's date into Received Date.
    /// Also restores availability for all games in the order.
    /// </summary>
    public bool MarkOrderReceived(int orderId)
    {
        if (!File.Exists(_rentalsPath)) return false;

        var lines        = File.ReadAllLines(_rentalsPath).ToList();
        var receivedDate = DateTime.Now.ToString("yyyy-MM-dd");
        bool found       = false;

        for (int i = 1; i < lines.Count; i++)
        {
            var cols = SplitCsvLine(lines[i]);
            if (cols.Length < 8) continue;

            if (!int.TryParse(cols[0].Trim(), out var id) || id != orderId) continue;

            var receivedCol = cols[6].Trim().Trim('"');
            if (!string.IsNullOrWhiteSpace(receivedCol)) continue; // already received

            cols[6]  = Csv(receivedDate);
            lines[i] = string.Join(",", cols);
            found    = true;
            break;
        }

        if (found) File.WriteAllLines(_rentalsPath, lines, System.Text.Encoding.UTF8);
        return found;
    }

    /// <summary>
    /// Returns open rental info keyed by game ID for card display.
    /// Value = (Renter, StartDate, EndDate, OrderId, IsOverdue)
    /// </summary>
    public Dictionary<int, (string Renter, string StartDate, string EndDate, int OrderId, bool IsOverdue)>
        GetOpenRentalsByGameId()
    {
        var result = new Dictionary<int, (string, string, string, int, bool)>();
        if (!File.Exists(_rentalsPath)) return result;

        foreach (var line in File.ReadAllLines(_rentalsPath).Skip(1))
        {
            var cols = SplitCsvLine(line);
            if (cols.Length < 8) continue;

            if (!int.TryParse(cols[0].Trim(), out var orderId)) continue;

            var renter      = cols[1].Trim('"').Trim();
            var start       = cols[2].Trim('"').Trim();
            var end         = cols[3].Trim('"').Trim();
            var receivedCol = cols[6].Trim().Trim('"');
            var gameIdsRaw  = cols[7].Trim().Trim('"');

            if (!string.IsNullOrWhiteSpace(receivedCol)) continue; // closed order

            bool isOverdue = DateTime.TryParse(end, out var endDate) && endDate.Date < DateTime.Today;

            foreach (var part in gameIdsRaw.Split(';', StringSplitOptions.RemoveEmptyEntries))
            {
                if (int.TryParse(part.Trim(), out var gameId))
                    result[gameId] = (renter, start, end, orderId, isOverdue);
            }
        }

        return result;
    }

    /// <summary>
    /// Returns all rental records, most recent first.
    /// </summary>
    public List<RentalRecord> GetAllRentals()
    {
        var result = new List<RentalRecord>();
        if (!File.Exists(_rentalsPath)) return result;

        foreach (var line in File.ReadAllLines(_rentalsPath).Skip(1))
        {
            var cols = SplitCsvLine(line);
            if (cols.Length < 8) continue;

            if (!int.TryParse(cols[0].Trim(), out var id)) continue;

            result.Add(new RentalRecord
            {
                Id           = id,
                Renter       = cols[1].Trim('"').Trim(),
                StartDate    = cols[2].Trim('"').Trim(),
                EndDate      = cols[3].Trim('"').Trim(),
                PhoneNumber  = cols[4].Trim('"').Trim(),
                RecordedAt   = cols[5].Trim('"').Trim(),
                ReceivedDate = cols[6].Trim('"').Trim(),
                GameIds      = cols[7].Trim('"').Trim(),
                RentalPrice  = cols.Length > 8 && decimal.TryParse(
                                   cols[8].Trim('"').Trim(),
                                   System.Globalization.NumberStyles.Any,
                                   CultureInfo.InvariantCulture,
                                   out var price) ? price : 0
            });
        }

        result.Sort((a, b) => b.Id.CompareTo(a.Id)); // most recent first
        return result;
    }

    /// <summary>
    /// Returns all open orders that are due tomorrow — used by the overdue email service.
    /// </summary>
    public List<RentalRecord> GetOrdersDueTomorrow()
    {
        return GetAllRentals()
            .Where(r => r.IsDueTomorrow)
            .ToList();
    }

    /// <summary>
    /// Returns all open orders that are overdue.
    /// </summary>
    public List<RentalRecord> GetOverdueOrders()
    {
        return GetAllRentals()
            .Where(r => r.IsOverdue)
            .ToList();
    }

    // ════════════════════════════════════════
    //  Private helpers
    // ════════════════════════════════════════

    private int GetNextRentalId()
    {
        if (!File.Exists(_rentalsPath)) return 1;
        var lines = File.ReadAllLines(_rentalsPath).Skip(1);
        int max   = 0;
        foreach (var line in lines)
        {
            var cols = SplitCsvLine(line);
            if (cols.Length > 0 && int.TryParse(cols[0].Trim(), out var id))
                max = Math.Max(max, id);
        }
        return max + 1;
    }

    private static void EnsureDirectory(string filePath)
    {
        var dir = Path.GetDirectoryName(filePath);
        if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);
    }

    private static string Csv(string? value)
    {
        if (string.IsNullOrEmpty(value)) return "";
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
            return $"\"{value.Replace("\"", "\"\"")}\"";
        return value;
    }

    private static string[] SplitCsvLine(string line)
    {
        var fields  = new List<string>();
        bool inQ    = false;
        var current = new System.Text.StringBuilder();

        for (int i = 0; i < line.Length; i++)
        {
            char c = line[i];
            if (c == '"')
            {
                if (inQ && i + 1 < line.Length && line[i + 1] == '"')
                { current.Append('"'); i++; }
                else
                { inQ = !inQ; current.Append(c); }
            }
            else if (c == ',' && !inQ)
            { fields.Add(current.ToString()); current.Clear(); }
            else
            { current.Append(c); }
        }

        fields.Add(current.ToString());
        return fields.ToArray();
    }
}

// ── CsvHelper class map ───────────────────────────────────────────────────────
public class GameMap : ClassMap<Game>
{
    public GameMap()
    {
        Map(m => m.Id).Name("Id");
        Map(m => m.Cover).Name("Cover");
        Map(m => m.TabletopGame).Name("Tabletop Game");
        Map(m => m.Category).Name("Category");
        Map(m => m.Theme).Name("Theme");
        Map(m => m.Complexity).Name("Complexity");
        Map(m => m.Price).Name("Price");
        Map(m => m.Tier).Name("Tier");
        Map(m => m.Type).Name("Type");
        Map(m => m.BGGScore).Name("BGG Score");
        Map(m => m.PlayerCount).Name("Player Count");
        Map(m => m.Age).Name("Age");
        Map(m => m.RecommendedPlayers).Name("Recommended Players");
        Map(m => m.AvgPlaytime).Name("Avg. Playtime");
        Map(m => m.Availability).Name("Availability");
        Map(m => m.MissingParts).Name("Missing Parts");
        Map(m => m.URL).Name("URL");
    }
}