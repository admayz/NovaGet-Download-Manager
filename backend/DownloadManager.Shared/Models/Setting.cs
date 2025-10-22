namespace DownloadManager.Shared.Models;

public class Setting
{
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public SettingType Type { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public enum SettingType
{
    String,
    Number,
    Boolean,
    Json
}
