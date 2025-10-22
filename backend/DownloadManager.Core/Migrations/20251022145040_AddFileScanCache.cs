using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DownloadManager.Core.Migrations
{
    /// <inheritdoc />
    public partial class AddFileScanCache : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "FileScanCaches",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    FileHash = table.Column<string>(type: "TEXT", nullable: false),
                    IsSafe = table.Column<bool>(type: "INTEGER", nullable: false),
                    PositiveDetections = table.Column<int>(type: "INTEGER", nullable: false),
                    TotalScans = table.Column<int>(type: "INTEGER", nullable: false),
                    ScanResultJson = table.Column<string>(type: "TEXT", nullable: true),
                    ScannedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FileScanCaches", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_FileScanCaches_ExpiresAt",
                table: "FileScanCaches",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_FileScanCaches_FileHash",
                table: "FileScanCaches",
                column: "FileHash");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FileScanCaches");
        }
    }
}
