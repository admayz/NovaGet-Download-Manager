using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace DownloadManager.Core.Data;

public class DownloadManagerDbContextFactory : IDesignTimeDbContextFactory<DownloadManagerDbContext>
{
    public DownloadManagerDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<DownloadManagerDbContext>();
        optionsBuilder.UseSqlite("Data Source=downloadmanager.db");

        return new DownloadManagerDbContext(optionsBuilder.Options);
    }
}
