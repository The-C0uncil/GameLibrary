namespace GameLibrary.Models;

public class RentalRequest
{
    public string     RenterName  { get; set; } = "";
    public string     StartDate   { get; set; } = "";
    public string     EndDate     { get; set; } = "";
    public string     PhoneNumber { get; set; } = "";
    /// <summary>Game IDs selected for this order.</summary>
    public List<int>  Games        { get; set; } = new();
    /// <summary>Calculated rental price in euros.</summary>
    public decimal    RentalPrice  { get; set; } = 0;
}