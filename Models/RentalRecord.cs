namespace GameLibrary.Models;

public class RentalRecord
{
    public string Game { get; set; } = "";
    public string Renter { get; set; } = "";
    public string StartDate { get; set; } = "";
    public string EndDate { get; set; } = "";
    public string PhoneNumber { get; set; } = "";
    public string RecordedAt { get; set; } = "";
    public string ReceivedDate { get; set; } = "";

    public bool IsOpen => string.IsNullOrWhiteSpace(ReceivedDate);
}