using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DownloadManager.Core.Migrations
{
    /// <inheritdoc />
    public partial class AddSegmentMirrorAssignment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AssignedMirrorId",
                table: "DownloadSegments",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_DownloadSegments_AssignedMirrorId",
                table: "DownloadSegments",
                column: "AssignedMirrorId");

            migrationBuilder.AddForeignKey(
                name: "FK_DownloadSegments_MirrorUrls_AssignedMirrorId",
                table: "DownloadSegments",
                column: "AssignedMirrorId",
                principalTable: "MirrorUrls",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DownloadSegments_MirrorUrls_AssignedMirrorId",
                table: "DownloadSegments");

            migrationBuilder.DropIndex(
                name: "IX_DownloadSegments_AssignedMirrorId",
                table: "DownloadSegments");

            migrationBuilder.DropColumn(
                name: "AssignedMirrorId",
                table: "DownloadSegments");
        }
    }
}
