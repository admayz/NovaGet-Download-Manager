using Microsoft.EntityFrameworkCore;
using DownloadManager.Shared.Models;

namespace DownloadManager.Core.Data;

public class DownloadManagerDbContext : DbContext
{
    public DownloadManagerDbContext(DbContextOptions<DownloadManagerDbContext> options)
        : base(options)
    {
    }

    public DbSet<DownloadTask> Downloads { get; set; }
    public DbSet<DownloadSegment> DownloadSegments { get; set; }
    public DbSet<MirrorUrl> MirrorUrls { get; set; }
    public DbSet<MirrorFailoverEvent> MirrorFailoverEvents { get; set; }
    public DbSet<ScheduledDownload> ScheduledDownloads { get; set; }
    public DbSet<Category> Categories { get; set; }
    public DbSet<Setting> Settings { get; set; }
    public DbSet<DownloadHistory> DownloadHistory { get; set; }
    public DbSet<QuarantinedFile> QuarantinedFiles { get; set; }
    public DbSet<FileScanCache> FileScanCaches { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // DownloadTask configuration
        modelBuilder.Entity<DownloadTask>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Url).IsRequired();
            entity.Property(e => e.Filename).IsRequired();
            entity.Property(e => e.Status).IsRequired();
            entity.Property(e => e.CreatedAt).IsRequired();
            
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.Category);
            entity.HasIndex(e => e.CreatedAt);
            
            entity.HasMany(e => e.Segments)
                .WithOne(e => e.Download)
                .HasForeignKey(e => e.DownloadId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // DownloadSegment configuration
        modelBuilder.Entity<DownloadSegment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.DownloadId).IsRequired();
            entity.Property(e => e.SegmentIndex).IsRequired();
            entity.Property(e => e.Status).IsRequired();
            
            entity.HasIndex(e => e.DownloadId);
            entity.HasIndex(e => new { e.DownloadId, e.SegmentIndex }).IsUnique();
            
            entity.HasOne(e => e.AssignedMirror)
                .WithMany()
                .HasForeignKey(e => e.AssignedMirrorId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // MirrorUrl configuration
        modelBuilder.Entity<MirrorUrl>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.DownloadId).IsRequired();
            entity.Property(e => e.Url).IsRequired();
            entity.Property(e => e.Priority).IsRequired();
            entity.Property(e => e.IsHealthy).IsRequired();
            
            entity.HasIndex(e => e.DownloadId);
            entity.HasIndex(e => new { e.DownloadId, e.Priority });
            
            entity.HasOne(e => e.Download)
                .WithMany(e => e.MirrorUrls)
                .HasForeignKey(e => e.DownloadId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // MirrorFailoverEvent configuration
        modelBuilder.Entity<MirrorFailoverEvent>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.SegmentId).IsRequired();
            entity.Property(e => e.Reason).IsRequired();
            entity.Property(e => e.OccurredAt).IsRequired();
            
            entity.HasIndex(e => e.SegmentId);
            entity.HasIndex(e => e.OccurredAt);
            
            entity.HasOne(e => e.Segment)
                .WithMany()
                .HasForeignKey(e => e.SegmentId)
                .OnDelete(DeleteBehavior.Cascade);
                
            entity.HasOne(e => e.OldMirror)
                .WithMany()
                .HasForeignKey(e => e.OldMirrorId)
                .OnDelete(DeleteBehavior.SetNull);
                
            entity.HasOne(e => e.NewMirror)
                .WithMany()
                .HasForeignKey(e => e.NewMirrorId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // ScheduledDownload configuration
        modelBuilder.Entity<ScheduledDownload>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.DownloadId).IsRequired();
            entity.Property(e => e.ScheduledTime).IsRequired();
            entity.Property(e => e.IsActive).IsRequired();
            
            entity.HasIndex(e => new { e.NextRun, e.IsActive });
            
            entity.HasOne(e => e.Download)
                .WithMany()
                .HasForeignKey(e => e.DownloadId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Category configuration
        modelBuilder.Entity<Category>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired();
            entity.Property(e => e.FolderPath).IsRequired();
            entity.Property(e => e.IsSystem).IsRequired();
            
            entity.HasIndex(e => e.Name).IsUnique();
        });

        // Setting configuration
        modelBuilder.Entity<Setting>(entity =>
        {
            entity.HasKey(e => e.Key);
            entity.Property(e => e.Value).IsRequired();
            entity.Property(e => e.Type).IsRequired();
        });

        // DownloadHistory configuration
        modelBuilder.Entity<DownloadHistory>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.DownloadId).IsRequired();
            entity.Property(e => e.EventType).IsRequired();
            entity.Property(e => e.Timestamp).IsRequired();
            
            entity.HasIndex(e => e.DownloadId);
            
            entity.HasOne(e => e.Download)
                .WithMany()
                .HasForeignKey(e => e.DownloadId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // QuarantinedFile configuration
        modelBuilder.Entity<QuarantinedFile>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.DownloadId).IsRequired();
            entity.Property(e => e.OriginalPath).IsRequired();
            entity.Property(e => e.QuarantinePath).IsRequired();
            entity.Property(e => e.QuarantinedAt).IsRequired();
            
            entity.HasOne(e => e.Download)
                .WithMany()
                .HasForeignKey(e => e.DownloadId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // FileScanCache configuration
        modelBuilder.Entity<FileScanCache>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.FileHash).IsRequired();
            entity.Property(e => e.IsSafe).IsRequired();
            entity.Property(e => e.ScannedAt).IsRequired();
            entity.Property(e => e.ExpiresAt).IsRequired();
            
            entity.HasIndex(e => e.FileHash);
            entity.HasIndex(e => e.ExpiresAt);
        });

        // Seed default categories
        modelBuilder.Entity<Category>().HasData(
            new Category
            {
                Id = 1,
                Name = "Video",
                FolderPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Downloads", "Videos"),
                FileExtensions = "[\"mp4\",\"avi\",\"mkv\",\"mov\",\"wmv\",\"flv\",\"webm\"]",
                MimeTypes = "[\"video/mp4\",\"video/x-msvideo\",\"video/x-matroska\"]",
                IsSystem = true,
                Color = "#ef4444",
                Icon = "video"
            },
            new Category
            {
                Id = 2,
                Name = "Documents",
                FolderPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Downloads", "Documents"),
                FileExtensions = "[\"pdf\",\"doc\",\"docx\",\"xls\",\"xlsx\",\"ppt\",\"pptx\",\"txt\"]",
                MimeTypes = "[\"application/pdf\",\"application/msword\",\"application/vnd.openxmlformats-officedocument.wordprocessingml.document\"]",
                IsSystem = true,
                Color = "#3b82f6",
                Icon = "document"
            },
            new Category
            {
                Id = 3,
                Name = "Software",
                FolderPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Downloads", "Software"),
                FileExtensions = "[\"exe\",\"msi\",\"dmg\",\"pkg\",\"deb\",\"rpm\"]",
                MimeTypes = "[\"application/x-msdownload\",\"application/x-msi\"]",
                IsSystem = true,
                Color = "#8b5cf6",
                Icon = "software"
            },
            new Category
            {
                Id = 4,
                Name = "Archives",
                FolderPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Downloads", "Archives"),
                FileExtensions = "[\"zip\",\"rar\",\"7z\",\"tar\",\"gz\",\"bz2\"]",
                MimeTypes = "[\"application/zip\",\"application/x-rar-compressed\",\"application/x-7z-compressed\"]",
                IsSystem = true,
                Color = "#f59e0b",
                Icon = "archive"
            },
            new Category
            {
                Id = 5,
                Name = "Music",
                FolderPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Downloads", "Music"),
                FileExtensions = "[\"mp3\",\"wav\",\"flac\",\"aac\",\"ogg\",\"m4a\"]",
                MimeTypes = "[\"audio/mpeg\",\"audio/wav\",\"audio/flac\"]",
                IsSystem = true,
                Color = "#10b981",
                Icon = "music"
            },
            new Category
            {
                Id = 6,
                Name = "Images",
                FolderPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Downloads", "Images"),
                FileExtensions = "[\"jpg\",\"jpeg\",\"png\",\"gif\",\"bmp\",\"svg\",\"webp\"]",
                MimeTypes = "[\"image/jpeg\",\"image/png\",\"image/gif\"]",
                IsSystem = true,
                Color = "#ec4899",
                Icon = "image"
            },
            new Category
            {
                Id = 7,
                Name = "Other",
                FolderPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Downloads", "Other"),
                FileExtensions = "[]",
                MimeTypes = "[]",
                IsSystem = true,
                Color = "#6b7280",
                Icon = "file"
            }
        );
    }
}
