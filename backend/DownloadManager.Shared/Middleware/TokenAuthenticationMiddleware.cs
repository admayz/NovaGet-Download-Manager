using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net;
using System.Text.Json;

namespace DownloadManager.Shared.Middleware;

/// <summary>
/// Simple token-based authentication middleware for local API access
/// </summary>
public class TokenAuthenticationMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<TokenAuthenticationMiddleware> _logger;
    private readonly string? _authToken;
    private const string AuthHeaderName = "X-Auth-Token";

    public TokenAuthenticationMiddleware(
        RequestDelegate next, 
        ILogger<TokenAuthenticationMiddleware> logger,
        IConfiguration configuration)
    {
        _next = next;
        _logger = logger;
        _authToken = configuration["Authentication:Token"];
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Skip authentication for health check endpoint
        if (context.Request.Path.StartsWithSegments("/api/health"))
        {
            await _next(context);
            return;
        }

        // If no token is configured, allow all requests (development mode)
        if (string.IsNullOrEmpty(_authToken))
        {
            await _next(context);
            return;
        }

        // Check for auth token in header
        if (!context.Request.Headers.TryGetValue(AuthHeaderName, out var token) || 
            token != _authToken)
        {
            _logger.LogWarning(
                "Unauthorized access attempt from {RemoteIp} to {Path}",
                context.Connection.RemoteIpAddress,
                context.Request.Path);

            context.Response.StatusCode = (int)HttpStatusCode.Unauthorized;
            context.Response.ContentType = "application/json";
            
            var errorResponse = new
            {
                statusCode = 401,
                message = "Unauthorized. Valid authentication token required.",
                timestamp = DateTime.UtcNow
            };
            
            var json = JsonSerializer.Serialize(errorResponse, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            });
            
            await context.Response.WriteAsync(json);
            return;
        }

        await _next(context);
    }
}
