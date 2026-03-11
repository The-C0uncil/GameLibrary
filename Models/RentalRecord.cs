namespace GameLibrary.Models;

public class RentalRecord
{
    public int Id { get; set; }
    public string Renter { get; set; } = "";
    public string StartDate { get; set; } = "";
    public string EndDate { get; set; } = "";
    public string PhoneNumber { get; set; } = "";
    public string RecordedAt { get; set; } = "";
    public string ReceivedDate { get; set; } = "";
    public string GameIds { get; set; } = "";

    public bool IsOpen => string.IsNullOrWhiteSpace(ReceivedDate);
    public bool IsOverdue => IsOpen && DateTime.TryParse(EndDate, out var end) && end.Date < DateTime.Today;
    public bool IsDueTomorrow => IsOpen && DateTime.TryParse(EndDate, out var end) && end.Date == DateTime.Today.AddDays(1);

    public List<int> ParsedGameIds =>
        GameIds.Split(';', StringSplitOptions.RemoveEmptyEntries)
                .Select(s => int.TryParse(s.Trim(), out var id) ? id : -1)
                .Where(id => id > 0)
                .ToList();
}