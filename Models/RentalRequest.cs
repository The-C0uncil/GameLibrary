using System;

namespace GameLibrary.Models;

public class RentalRequest
{
    public string RenterName { get; set; } = "";
    public string StartDate { get; set; } = "";
    public string EndDate { get; set; } = "";
    public string PhoneNumber { get; set; } = "";
    public List<string> Games { get; set; } = new();
}