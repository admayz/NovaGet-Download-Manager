using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DownloadManager.Core.Migrations
{
    /// <inheritdoc />
    public partial class AddMirrorFailoverEvents : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MirrorFailoverEvents",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    SegmentId = table.Column<int>(type: "INTEGER", nullable: false),
                    OldMirrorId = table.Column<int>(type: "INTEGER", nullable: true),
                    NewMirrorId = table.Column<int>(type: "INTEGER", nullable: true),
                    OldMirrorUrl = table.Column<string>(type: "TEXT", nullable: true),
                    NewMirrorUrl = table.Column<string>(type: "TEXT", nullable: true),
                    Reason = table.Column<string>(type: "TEXT", nullable: false),
                    OccurredAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MirrorFailoverEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MirrorFailoverEvents_DownloadSegments_SegmentId",
                        column: x => x.SegmentId,
                        principalTable: "DownloadSegments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MirrorFailoverEvents_MirrorUrls_NewMirrorId",
                        column: x => x.NewMirrorId,
                        principalTable: "MirrorUrls",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_MirrorFailoverEvents_MirrorUrls_OldMirrorId",
                        column: x => x.OldMirrorId,
                        principalTable: "MirrorUrls",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MirrorFailoverEvents_NewMirrorId",
                table: "MirrorFailoverEvents",
                column: "NewMirrorId");

            migrationBuilder.CreateIndex(
                name: "IX_MirrorFailoverEvents_OccurredAt",
                table: "MirrorFailoverEvents",
                column: "OccurredAt");

            migrationBuilder.CreateIndex(
                name: "IX_MirrorFailoverEvents_OldMirrorId",
                table: "MirrorFailoverEvents",
                column: "OldMirrorId");

            migrationBuilder.CreateIndex(
                name: "IX_MirrorFailoverEvents_SegmentId",
                table: "MirrorFailoverEvents",
                column: "SegmentId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MirrorFailoverEvents");
        }
    }
}
