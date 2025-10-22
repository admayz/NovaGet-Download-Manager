namespace DownloadManager.Shared.Models;

public class Category
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string FolderPath { get; set; } = string.Empty;
    public string? FileExtensions { get; set; }
    public string? MimeTypes { get; set; }
    public bool IsSystem { get; set; }
    public string? Color { get; set; }
    public string? Icon { get; set; }
}
