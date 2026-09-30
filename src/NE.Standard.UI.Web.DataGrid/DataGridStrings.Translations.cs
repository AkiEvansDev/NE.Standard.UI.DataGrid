using System;
using System.Collections.Frozen;
using System.Collections.Generic;

namespace NE.Standard.UI.Web.DataGrid;

public sealed partial class DataGridStrings
{
    /// <inheritdoc/>
    public IReadOnlyDictionary<string, IReadOnlyDictionary<string, string>> Translations { get; } = new Dictionary<string, IReadOnlyDictionary<string, string>>(StringComparer.Ordinal)
    {
        ["ru"] = new Dictionary<string, string>(StringComparer.Ordinal)
        {
            [Yes] = "Да",
            [No] = "Нет",
            [SortBy] = "Сортировать по: {column}",
            [Filter] = "Фильтр",
            [From] = "От",
            [To] = "До",
            [Any] = "Любое",
            [Search] = "Поиск",
            [Filters] = "Фильтры",
            [ClearFilters] = "Сбросить фильтры",
            [Columns] = "Столбцы",
            [Details] = "Подробности",
            [PageOf] = "{from}–{to} из {total}",
            [PageRange] = "{from}–{to}",
            [FirstPage] = "Первая страница",
            [PreviousPage] = "Предыдущая страница",
            [NextPage] = "Следующая страница",
            [LastPage] = "Последняя страница",
            [SelectRow] = "Выбрать строку",
            [SelectAll] = "Выбрать все строки"
        }.ToFrozenDictionary(StringComparer.Ordinal),
        ["zh-Hans"] = new Dictionary<string, string>(StringComparer.Ordinal)
        {
            [Yes] = "是",
            [No] = "否",
            [SortBy] = "按{column}排序",
            [Filter] = "筛选",
            [From] = "从",
            [To] = "到",
            [Any] = "任意",
            [Search] = "搜索",
            [Filters] = "筛选器",
            [ClearFilters] = "清除筛选",
            [Columns] = "列",
            [Details] = "详情",
            [PageOf] = "第 {from}–{to} 行，共 {total} 行",
            [PageRange] = "第 {from}–{to} 行",
            [FirstPage] = "第一页",
            [PreviousPage] = "上一页",
            [NextPage] = "下一页",
            [LastPage] = "最后一页",
            [SelectRow] = "选择行",
            [SelectAll] = "选择所有行"
        }.ToFrozenDictionary(StringComparer.Ordinal)
    }.ToFrozenDictionary(StringComparer.Ordinal);
}
