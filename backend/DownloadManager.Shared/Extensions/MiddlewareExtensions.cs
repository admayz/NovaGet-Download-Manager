using Microsoft.AspNetCore.Builder;
using DownloadManager.Shared.Logging;
using DownloadManager.Shared.Middleware;

namespace DownloadManager.Shared.Extensions;

public static class MiddlewareExtensions
{
    public static IApplicationBuilder UseCorrelationId(this IApplicationBuilder app)
    {
        return app.UseMiddleware<CorrelationIdMiddleware>();
    }

    public static IApplicationBuilder UseGlobalExceptionHandler(this IApplicationBuilder app)
    {
        return app.UseMiddleware<GlobalExceptionHandlerMiddleware>();
    }

    public static IApplicationBuilder UseTokenAuthentication(this IApplicationBuilder app)
    {
        return app.UseMiddleware<TokenAuthenticationMiddleware>();
    }
}
