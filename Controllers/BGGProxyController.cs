using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace GameLibrary.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BGGProxyController : ControllerBase
    {
        private readonly HttpClient _httpClient;

        public BGGProxyController(IHttpClientFactory httpClientFactory)
        {
            _httpClient = httpClientFactory.CreateClient();
        }

        [HttpGet("{bggId}")]
        public async Task<IActionResult> GetBGGData(string bggId)
        {
            try
            {
                var apiUrl = $"https://www.boardgamegeek.com/xmlapi2/thing?id={bggId}&stats=1";
                var response = await _httpClient.GetAsync(apiUrl);

                if (!response.IsSuccessStatusCode)
                {
                    return StatusCode((int)response.StatusCode, "Error fetching BGG data");
                }

                var content = await response.Content.ReadAsStringAsync();
                return Content(content, "application/xml");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error: {ex.Message}");
            }
        }
    }
}
