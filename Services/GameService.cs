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

    private static readonly string RentalsHeader =
        "Game,Renter,Start Date,End Date,Phone Number,Recorded At,Received Date";

    public GameService(IWebHostEnvironment env)
    {
        var dataDir = Path.Combine(env.ContentRootPath, "Data");
        _gameListPath = Path.Combine(dataDir, "game_list.csv");
        _rentalsPath = Path.Combine(dataDir, "rentals.csv");
    }

    // ════════════════════════════════════════
    //  Game list
    // ════════════════════════════════════════

    public List<Game> GetAllGames()
    {
        using var reader = new StreamReader(_gameListPath);
        using var csv = new CsvReader(reader, CsvConfig);
        csv.Context.RegisterClassMap<GameMap>();
        return csv.GetRecords<Game>().ToList();
    }

    /// <summary>
    /// Flips the Availability field for a single game and rewrites game_list.csv.
    /// Uses CsvHelper for both read and write so formatting stays consistent.
    /// </summary>
    public bool SetGameAvailability(string gameName, bool available)
    {
        if (!File.Exists(_gameListPath)) return false;

        var games = GetAllGames();
        var game = games.FirstOrDefault(g =>
            string.Equals(g.TabletopGame, gameName, StringComparison.OrdinalIgnoreCase));

        if (game == null) return false;
        game.Availability = available;

        using var writer = new StreamWriter(_gameListPath, append: false, System.Text.Encoding.UTF8);
        using var csv = new CsvWriter(writer, CsvConfig);
        csv.Context.RegisterClassMap<GameMap>();
        csv.WriteRecords(games);

        return true;
    }

    // ════════════════════════════════════════
    //  Rentals
    // ════════════════════════════════════════

    /// <summary>
    /// Appends one row per game. Received Date is left blank (open rental).
    /// </summary>
    public void AppendRentals(RentalRequest request)
    {
        EnsureDirectory(_rentalsPath);
        var timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
        bool exists = File.Exists(_rentalsPath);

        using var writer = new StreamWriter(_rentalsPath, append: true, System.Text.Encoding.UTF8);
        if (!exists) writer.WriteLine(RentalsHeader);

        foreach (var game in request.Games)
        {
            writer.WriteLine(string.Join(",", new[]
            {
                Csv(game),
                Csv(request.RenterName),
                Csv(request.StartDate),
                Csv(request.EndDate),
                Csv(request.PhoneNumber),
                Csv(timestamp),
                "" // Received Date — filled in when returned
            }));
        }
    }

    /// <summary>
    /// Finds the most recent open rental for a game and stamps today as Received Date.
    /// </summary>
    public bool MarkReceived(string gameName)
    {
        if (!File.Exists(_rentalsPath)) return false;

        var lines = File.ReadAllLines(_rentalsPath).ToList();
        var receivedDate = DateTime.Now.ToString("yyyy-MM-dd");
        bool found = false;

        // Walk backwards so the most recent open rental is hit first
        for (int i = lines.Count - 1; i >= 1; i--)
        {
            var cols = SplitCsvLine(lines[i]);
            if (cols.Length < 6) continue;

            var lineGame = cols[0].Trim('"').Trim();
            var receivedCol = cols.Length > 6 ? cols[6].Trim().Trim('"') : "";

            if (string.Equals(lineGame, gameName, StringComparison.OrdinalIgnoreCase)
                && string.IsNullOrWhiteSpace(receivedCol))
            {
                if (cols.Length < 7) Array.Resize(ref cols, 7);
                cols[6] = Csv(receivedDate);
                lines[i] = string.Join(",", cols);
                found = true;
                break;
            }
        }

        if (found) File.WriteAllLines(_rentalsPath, lines, System.Text.Encoding.UTF8);
        return found;
    }

    /// <summary>
    /// Returns the most recent open rental per game name.
    /// Key = game name, Value = (Renter, StartDate, EndDate)
    /// </summary>
    public Dictionary<string, (string Renter, string StartDate, string EndDate)> GetOpenRentals()
    {
        var result = new Dictionary<string, (string, string, string)>(StringComparer.OrdinalIgnoreCase);
        if (!File.Exists(_rentalsPath)) return result;

        foreach (var line in File.ReadAllLines(_rentalsPath).Skip(1))
        {
            var cols = SplitCsvLine(line);
            if (cols.Length < 6) continue;

            var game = cols[0].Trim('"').Trim();
            var renter = cols[1].Trim('"').Trim();
            var start = cols[2].Trim('"').Trim();
            var end = cols[3].Trim('"').Trim();
            var receivedCol = cols.Length > 6 ? cols[6].Trim().Trim('"') : "";

            if (string.IsNullOrWhiteSpace(game)) continue;

            if (string.IsNullOrWhiteSpace(receivedCol))
                result[game] = (renter, start, end); // open — last entry wins
            else
                result.Remove(game);                 // closed — remove from open set
        }

        return result;
    }

    /// <summary>
    /// Returns full rental history grouped by game name, in chronological order.
    /// </summary>
    public Dictionary<string, List<RentalRecord>> GetRentalHistory()
    {
        var result = new Dictionary<string, List<RentalRecord>>(StringComparer.OrdinalIgnoreCase);
        if (!File.Exists(_rentalsPath)) return result;

        foreach (var line in File.ReadAllLines(_rentalsPath).Skip(1))
        {
            var cols = SplitCsvLine(line);
            if (cols.Length < 6) continue;

            var game = cols[0].Trim('"').Trim();
            if (string.IsNullOrWhiteSpace(game)) continue;

            var record = new RentalRecord
            {
                Game = game,
                Renter = cols[1].Trim('"').Trim(),
                StartDate = cols[2].Trim('"').Trim(),
                EndDate = cols[3].Trim('"').Trim(),
                PhoneNumber = cols[4].Trim('"').Trim(),
                RecordedAt = cols[5].Trim('"').Trim(),
                ReceivedDate = cols.Length > 6 ? cols[6].Trim('"').Trim() : ""
            };

            if (!result.ContainsKey(game)) result[game] = [];
            result[game].Add(record);
        }

        return result;
    }

    // ════════════════════════════════════════
    //  Private helpers
    // ════════════════════════════════════════

    private static void EnsureDirectory(string filePath)
    {
        var dir = Path.GetDirectoryName(filePath);
        if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);
    }

    /// <summary>RFC 4180-compliant escaper for the rentals log.</summary>
    private static string Csv(string? value)
    {
        if (string.IsNullOrEmpty(value)) return "";
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
            return $"\"{value.Replace("\"", "\"\"")}\"";
        return value;
    }

    /// <summary>Quoted-field-aware CSV line splitter for the rentals log.</summary>
    private static string[] SplitCsvLine(string line)
    {
        var fields = new List<string>();
        bool inQ = false;
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

public class GameMap : ClassMap<Game>
{
    public GameMap()
    {
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