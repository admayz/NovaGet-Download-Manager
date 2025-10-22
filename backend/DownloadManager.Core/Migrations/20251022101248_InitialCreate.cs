using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace DownloadManager.Core.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Categories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    FolderPath = table.Column<string>(type: "TEXT", nullable: false),
                    FileExtensions = table.Column<string>(type: "TEXT", nullable: true),
                    MimeTypes = table.Column<string>(type: "TEXT", nullable: true),
                    IsSystem = table.Column<bool>(type: "INTEGER", nullable: false),
                    Color = table.Column<string>(type: "TEXT", nullable: true),
                    Icon = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Categories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Downloads",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Url = table.Column<string>(type: "TEXT", nullable: false),
                    Filename = table.Column<string>(type: "TEXT", nullable: false),
                    FilePath = table.Column<string>(type: "TEXT", nullable: true),
                    TotalSize = table.Column<long>(type: "INTEGER", nullable: false),
                    DownloadedSize = table.Column<long>(type: "INTEGER", nullable: false),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    Category = table.Column<string>(type: "TEXT", nullable: true),
                    MimeType = table.Column<string>(type: "TEXT", nullable: true),
                    Checksum = table.Column<string>(type: "TEXT", nullable: true),
                    ChecksumAlgorithm = table.Column<int>(type: "INTEGER", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    StartedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    ErrorMessage = table.Column<string>(type: "TEXT", nullable: true),
                    RetryCount = table.Column<int>(type: "INTEGER", nullable: false),
                    SpeedLimit = table.Column<long>(type: "INTEGER", nullable: true),
                    Priority = table.Column<int>(type: "INTEGER", nullable: false),
                    Referrer = table.Column<string>(type: "TEXT", nullable: true),
                    UserAgent = table.Column<string>(type: "TEXT", nullable: true),
                    CloudId = table.Column<string>(type: "TEXT", nullable: true),
                    SyncToken = table.Column<string>(type: "TEXT", nullable: true),
                    LastModified = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Downloads", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Settings",
                columns: table => new
                {
                    Key = table.Column<string>(type: "TEXT", nullable: false),
                    Value = table.Column<string>(type: "TEXT", nullable: false),
                    Type = table.Column<int>(type: "INTEGER", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Settings", x => x.Key);
                });

            migrationBuilder.CreateTable(
                name: "DownloadHistory",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    DownloadId = table.Column<Guid>(type: "TEXT", nullable: false),
                    EventType = table.Column<string>(type: "TEXT", nullable: false),
                    EventData = table.Column<string>(type: "TEXT", nullable: true),
                    Timestamp = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DownloadHistory", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DownloadHistory_Downloads_DownloadId",
                        column: x => x.DownloadId,
                        principalTable: "Downloads",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DownloadSegments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    DownloadId = table.Column<Guid>(type: "TEXT", nullable: false),
                    SegmentIndex = table.Column<int>(type: "INTEGER", nullable: false),
                    StartByte = table.Column<long>(type: "INTEGER", nullable: false),
                    EndByte = table.Column<long>(type: "INTEGER", nullable: false),
                    DownloadedBytes = table.Column<long>(type: "INTEGER", nullable: false),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    MirrorUrl = table.Column<string>(type: "TEXT", nullable: true),
                    RetryCount = table.Column<int>(type: "INTEGER", nullable: false),
                    ErrorMessage = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DownloadSegments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DownloadSegments_Downloads_DownloadId",
                        column: x => x.DownloadId,
                        principalTable: "Downloads",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "QuarantinedFiles",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    DownloadId = table.Column<Guid>(type: "TEXT", nullable: false),
                    OriginalPath = table.Column<string>(type: "TEXT", nullable: false),
                    QuarantinePath = table.Column<string>(type: "TEXT", nullable: false),
                    ScanResult = table.Column<string>(type: "TEXT", nullable: true),
                    QuarantinedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QuarantinedFiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_QuarantinedFiles_Downloads_DownloadId",
                        column: x => x.DownloadId,
                        principalTable: "Downloads",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ScheduledDownloads",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    DownloadId = table.Column<Guid>(type: "TEXT", nullable: false),
                    ScheduledTime = table.Column<DateTime>(type: "TEXT", nullable: false),
                    RecurrencePattern = table.Column<string>(type: "TEXT", nullable: true),
                    RecurrenceData = table.Column<string>(type: "TEXT", nullable: true),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    LastRun = table.Column<DateTime>(type: "TEXT", nullable: true),
                    NextRun = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ScheduledDownloads", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ScheduledDownloads_Downloads_DownloadId",
                        column: x => x.DownloadId,
                        principalTable: "Downloads",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "Categories",
                columns: new[] { "Id", "Color", "FileExtensions", "FolderPath", "Icon", "IsSystem", "MimeTypes", "Name" },
                values: new object[,]
                {
                    { 1, "#ef4444", "[\"mp4\",\"avi\",\"mkv\",\"mov\",\"wmv\",\"flv\",\"webm\"]", "C:\\Users\\meade\\Downloads\\Videos", "video", true, "[\"video/mp4\",\"video/x-msvideo\",\"video/x-matroska\"]", "Video" },
                    { 2, "#3b82f6", "[\"pdf\",\"doc\",\"docx\",\"xls\",\"xlsx\",\"ppt\",\"pptx\",\"txt\"]", "C:\\Users\\meade\\Downloads\\Documents", "document", true, "[\"application/pdf\",\"application/msword\",\"application/vnd.openxmlformats-officedocument.wordprocessingml.document\"]", "Documents" },
                    { 3, "#8b5cf6", "[\"exe\",\"msi\",\"dmg\",\"pkg\",\"deb\",\"rpm\"]", "C:\\Users\\meade\\Downloads\\Software", "software", true, "[\"application/x-msdownload\",\"application/x-msi\"]", "Software" },
                    { 4, "#f59e0b", "[\"zip\",\"rar\",\"7z\",\"tar\",\"gz\",\"bz2\"]", "C:\\Users\\meade\\Downloads\\Archives", "archive", true, "[\"application/zip\",\"application/x-rar-compressed\",\"application/x-7z-compressed\"]", "Archives" },
                    { 5, "#10b981", "[\"mp3\",\"wav\",\"flac\",\"aac\",\"ogg\",\"m4a\"]", "C:\\Users\\meade\\Downloads\\Music", "music", true, "[\"audio/mpeg\",\"audio/wav\",\"audio/flac\"]", "Music" },
                    { 6, "#ec4899", "[\"jpg\",\"jpeg\",\"png\",\"gif\",\"bmp\",\"svg\",\"webp\"]", "C:\\Users\\meade\\Downloads\\Images", "image", true, "[\"image/jpeg\",\"image/png\",\"image/gif\"]", "Images" },
                    { 7, "#6b7280", "[]", "C:\\Users\\meade\\Downloads\\Other", "file", true, "[]", "Other" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Categories_Name",
                table: "Categories",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DownloadHistory_DownloadId",
                table: "DownloadHistory",
                column: "DownloadId");

            migrationBuilder.CreateIndex(
                name: "IX_Downloads_Category",
                table: "Downloads",
                column: "Category");

            migrationBuilder.CreateIndex(
                name: "IX_Downloads_CreatedAt",
                table: "Downloads",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Downloads_Status",
                table: "Downloads",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_DownloadSegments_DownloadId",
                table: "DownloadSegments",
                column: "DownloadId");

            migrationBuilder.CreateIndex(
                name: "IX_DownloadSegments_DownloadId_SegmentIndex",
                table: "DownloadSegments",
                columns: new[] { "DownloadId", "SegmentIndex" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_QuarantinedFiles_DownloadId",
                table: "QuarantinedFiles",
                column: "DownloadId");

            migrationBuilder.CreateIndex(
                name: "IX_ScheduledDownloads_DownloadId",
                table: "ScheduledDownloads",
                column: "DownloadId");

            migrationBuilder.CreateIndex(
                name: "IX_ScheduledDownloads_NextRun_IsActive",
                table: "ScheduledDownloads",
                columns: new[] { "NextRun", "IsActive" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Categories");

            migrationBuilder.DropTable(
                name: "DownloadHistory");

            migrationBuilder.DropTable(
                name: "DownloadSegments");

            migrationBuilder.DropTable(
                name: "QuarantinedFiles");

            migrationBuilder.DropTable(
                name: "ScheduledDownloads");

            migrationBuilder.DropTable(
                name: "Settings");

            migrationBuilder.DropTable(
                name: "Downloads");
        }
    }
}
