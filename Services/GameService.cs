
using System.Globalization;
using CsvHelper;
using CsvHelper.Configuration;
using GameLibrary.Models;

namespace GameLibrary.Services;

public class GameService
    {
        private readonly string _csvPath;

        public GameService(IWebHostEnvironment env)
        {
            _csvPath = Path.Combine(env.ContentRootPath, "Data", "game_list.csv");
        }

        public List<Game> GetAllGames()
        {
            var games = new List<Game>();

            var config = new CsvConfiguration(CultureInfo.InvariantCulture)
            {
                HeaderValidated = null,
                MissingFieldFound = null
            };

            using (var reader = new StreamReader(_csvPath))
            using (var csv = new CsvReader(reader, config))
            {
                csv.Context.RegisterClassMap<GameMap>();
                games = csv.GetRecords<Game>().ToList();
            }

            return games;
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
