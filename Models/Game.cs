using System;

namespace GameLibrary.Models;

public class Game
{
    public string Cover { get; set; } = string.Empty;
    public string TabletopGame { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Theme { get; set; } = string.Empty;
    public string Complexity { get; set; } = string.Empty;
    public string Price { get; set; } = string.Empty;
    public string Tier { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string BGGScore { get; set; } = string.Empty;
    public string PlayerCount { get; set; } = string.Empty;
    public string Age { get; set; } = string.Empty;
    public string RecommendedPlayers { get; set; } = string.Empty;
    public string AvgPlaytime { get; set; } = string.Empty;
    public bool Availability { get; set; }
    public string MissingParts { get; set; } = string.Empty;
    public string URL { get; set; } = string.Empty;
}
