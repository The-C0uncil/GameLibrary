using System;

namespace GameLibrary.Models;

public class ContactForm
{
    public string Name { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public List<string> SelectedGames { get; set; } = new List<string>();
}
