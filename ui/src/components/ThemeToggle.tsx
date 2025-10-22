import { useTheme } from '../contexts/ThemeContext';

export default function ThemeToggle() {
  const { theme, effectiveTheme, setTheme } = useTheme();

  const themes = [
    { value: 'light' as const, icon: '☀️', label: 'Light' },
    { value: 'dark' as const, icon: '🌙', label: 'Dark' },
    { value: 'system' as const, icon: '💻', label: 'System' },
  ];

  return (
    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
      {themes.map((t) => (
        <button
          key={t.value}
          onClick={() => setTheme(t.value)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            theme === t.value
              ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
          title={t.label}
        >
          <span>{t.icon}</span>
          <span className="hidden sm:inline">{t.label}</span>
        </button>
      ))}
    </div>
  );
}
