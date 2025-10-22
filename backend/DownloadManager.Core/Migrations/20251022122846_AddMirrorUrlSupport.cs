using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DownloadManager.Core.Migrations
{
    /// <inheritdoc />
    public partial class AddMirrorUrlSupport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MirrorUrls",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    DownloadId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Url = table.Column<string>(type: "TEXT", nullable: false),
                    Priority = table.Column<int>(type: "INTEGER", nullable: false),
                    ResponseTimeMs = table.Column<long>(type: "INTEGER", nullable: false),
                    LastChecked = table.Column<DateTime>(type: "TEXT", nullable: true),
                    IsHealthy = table.Column<bool>(type: "INTEGER", nullable: false),
                    ErrorMessage = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MirrorUrls", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MirrorUrls_Downloads_DownloadId",
                        column: x => x.DownloadId,
                        principalTable: "Downloads",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MirrorUrls_DownloadId",
                table: "MirrorUrls",
                column: "DownloadId");

            migrationBuilder.CreateIndex(
                name: "IX_MirrorUrls_DownloadId_Priority",
                table: "MirrorUrls",
                columns: new[] { "DownloadId", "Priority" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MirrorUrls");
        }
    }
}
