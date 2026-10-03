using System;
using System.Collections.Generic;

namespace DemoApp.DataGrid;

/// <summary>
/// The demo's words in its two languages: the pages' names and descriptions, the column captions, the plans and statuses, the status
/// lines under the grids, the page's own buttons and tooltips; the framework's, the code field's and the grid's words are the tables
/// they ship, so the missing-word report in Development names only a real gap (DemoWordsCoverageTests). The sections' prose and the
/// data are left as written on purpose: under <see cref="KeyPrefix"/> they are content.
/// </summary>
internal static class DataGridDemoWords
{
    /// <summary>What every key of the demo starts with; every other string is content (<c>KeyPrefixes</c>).</summary>
    public const string KeyPrefix = "grid-demo.";

    private static readonly Dictionary<string, string> English = new(StringComparer.Ordinal)
    {
        ["grid-demo.column.customer"] = "Customer",
        ["grid-demo.column.country"] = "Country",
        ["grid-demo.column.plan"] = "Plan",
        ["grid-demo.column.status"] = "Status",
        ["grid-demo.column.usage"] = "Usage",
        ["grid-demo.column.servers"] = "Servers",
        ["grid-demo.column.monthly"] = "Monthly",
        ["grid-demo.column.started"] = "Started",
        ["grid-demo.column.paid"] = "Paid",
        ["grid-demo.column.price"] = "Per server",
        ["grid-demo.column.note"] = "Note",

        ["grid-demo.plan.starter"] = "Starter",
        ["grid-demo.plan.standard"] = "Standard",
        ["grid-demo.plan.pro"] = "Pro",
        ["grid-demo.plan.dedicated"] = "Dedicated",

        ["grid-demo.status.trial"] = "Trial",
        ["grid-demo.status.active"] = "Active",
        ["grid-demo.status.past-due"] = "Past due",
        ["grid-demo.status.suspended"] = "Suspended",
        ["grid-demo.status.cancelled"] = "Cancelled by the customer",

        ["grid-demo.page.columns"] = "Columns and editing",
        ["grid-demo.page.columns.description"] = "A grid from NE.Standard.UI.DataGrid over thirty subscriptions the page holds whole: sort by header, move a column, edit a cell, open a row's detail.",
        ["grid-demo.page.filters"] = "Filters and totals",
        ["grid-demo.page.filters.description"] = "A hundred and twenty subscriptions the page holds whole: sort, search and filters run in the browser, and the footer adds up what they leave.",
        ["grid-demo.page.source"] = "A large source",
        ["grid-demo.page.source.description"] = "The same columns over a windowed source of a hundred thousand subscriptions: the source sorts, narrows and adds up, and hands back the window on show.",

        ["grid-demo.code"] = "Code",
        ["grid-demo.copy"] = "Copy",
        ["grid-demo.detail.per-server"] = "Per server, monthly",

        ["grid-demo.edited"] = "{number}: {column} is now {value}.",
        ["grid-demo.columns.cells-edit"] = "Cells edit",
        ["grid-demo.columns.download"] = "Download CSV",
        ["grid-demo.columns.delete-chosen"] = "Delete chosen",
        ["grid-demo.columns.edit-hint"] = "Double-click a cell, or press F2 on the keyboard's row, to edit it.",
        ["grid-demo.columns.row-gone"] = "Row {id} is not on the page.",
        ["grid-demo.columns.selection-hint"] = "Tick a row to choose it; the button appears once something is chosen.",
        ["grid-demo.columns.none-chosen"] = "Nothing chosen.",
        ["grid-demo.columns.chosen.one"] = "{count} subscription of {total} chosen.",
        ["grid-demo.columns.chosen.other"] = "{count} subscriptions of {total} chosen.",
        ["grid-demo.quote.hint"] = "Double-click a cell and try 0 or 120 servers, a price over €300 or an empty note.",
        ["grid-demo.quote.servers-rule"] = "A line holds at least one server.",
        ["grid-demo.quote.price-rule"] = "Over €300 a server, a manager signs the quote off.",
        ["grid-demo.quote.note-rule"] = "No note: the team sets the servers up as the plan describes.",
        ["grid-demo.quote.empty"] = "empty",
        ["grid-demo.filters.hint"] = "A click chooses a row and shows its detail; a double click opens it, even on a cell the first page edits.",
        ["grid-demo.filters.chosen"] = "{number} chosen.",
        ["grid-demo.filters.opened"] = "{number} opened.",
        ["grid-demo.filters.keys-hint"] = "Tab to the grid, walk the rows with the arrows and press Enter on one.",
        ["grid-demo.filters.pressed"] = "{number} opened from its row.",
        ["grid-demo.source.past-due"] = "Past due, from €100 a month",
        ["grid-demo.source.no-filters"] = "No filters",
        ["grid-demo.source.not-asked"] = "The source has not been asked for anything but its first window.",
        ["grid-demo.source.edit-hint"] = "Double-click a cell to edit it: the write goes through the source, which keeps it and reads the subscription anew.",
        ["grid-demo.source.row-gone"] = "Row {id} is not in either window.",
        ["grid-demo.source.no-terms.one"] = "No terms: the source answers in its own order, {rows} row.",
        ["grid-demo.source.no-terms.other"] = "No terms: the source answers in its own order, {rows} rows.",
        ["grid-demo.source.matches.one"] = "{terms} — {rows} row matches, read on the server.",
        ["grid-demo.source.matches.other"] = "{terms} — {rows} rows match, read on the server."
    };

    // Chinese has one plural form, so a plural key has only its ".other".
    private static readonly Dictionary<string, string> Chinese = new(StringComparer.Ordinal)
    {
        ["grid-demo.column.customer"] = "客户",
        ["grid-demo.column.country"] = "国家",
        ["grid-demo.column.plan"] = "套餐",
        ["grid-demo.column.status"] = "状态",
        ["grid-demo.column.usage"] = "用量",
        ["grid-demo.column.servers"] = "服务器",
        ["grid-demo.column.monthly"] = "月费",
        ["grid-demo.column.started"] = "开始日期",
        ["grid-demo.column.paid"] = "已付",
        ["grid-demo.column.price"] = "每台服务器",
        ["grid-demo.column.note"] = "备注",

        ["grid-demo.plan.starter"] = "入门版",
        ["grid-demo.plan.standard"] = "标准版",
        ["grid-demo.plan.pro"] = "专业版",
        ["grid-demo.plan.dedicated"] = "专属版",

        ["grid-demo.status.trial"] = "试用",
        ["grid-demo.status.active"] = "有效",
        ["grid-demo.status.past-due"] = "逾期",
        ["grid-demo.status.suspended"] = "已暂停",
        ["grid-demo.status.cancelled"] = "客户已取消",

        ["grid-demo.page.columns"] = "列与编辑",
        ["grid-demo.page.columns.description"] = "NE.Standard.UI.DataGrid 的表格，列出页面完整持有的三十个订阅：按表头排序、移动列、编辑单元格、打开行的详情。",
        ["grid-demo.page.filters"] = "筛选与合计",
        ["grid-demo.page.filters.description"] = "页面完整持有的一百二十个订阅：排序、搜索和筛选都在浏览器中进行，表尾汇总筛选后剩下的行。",
        ["grid-demo.page.source"] = "大型数据源",
        ["grid-demo.page.source.description"] = "同样的列，基于十万个订阅的窗口化数据源：由数据源排序、筛选和汇总，并返回当前显示的窗口。",

        ["grid-demo.code"] = "代码",
        ["grid-demo.copy"] = "复制",
        ["grid-demo.detail.per-server"] = "每台服务器月费",

        ["grid-demo.edited"] = "{number}：{column} 现为 {value}。",
        ["grid-demo.columns.cells-edit"] = "单元格可编辑",
        ["grid-demo.columns.download"] = "下载 CSV",
        ["grid-demo.columns.delete-chosen"] = "删除所选",
        ["grid-demo.columns.edit-hint"] = "双击单元格，或在键盘所在行按 F2，即可编辑。",
        ["grid-demo.columns.row-gone"] = "第 {id} 行不在此页上。",
        ["grid-demo.columns.selection-hint"] = "勾选一行即可选中；选中后会出现按钮。",
        ["grid-demo.columns.none-chosen"] = "未选择任何订阅。",
        ["grid-demo.columns.chosen.other"] = "已选择 {count} 个订阅，共 {total} 个。",
        ["grid-demo.quote.hint"] = "双击单元格，试试 0 或 120 台服务器、超过 €300 的单价或空备注。",
        ["grid-demo.quote.servers-rule"] = "每行至少要有一台服务器。",
        ["grid-demo.quote.price-rule"] = "每台服务器超过 €300 时，报价需经理批准。",
        ["grid-demo.quote.note-rule"] = "没有备注：团队将按套餐说明配置服务器。",
        ["grid-demo.quote.empty"] = "空",
        ["grid-demo.filters.hint"] = "单击一行即可选中并显示其详情；双击则打开该行，即使双击的是首页中可编辑的单元格。",
        ["grid-demo.filters.chosen"] = "已选择 {number}。",
        ["grid-demo.filters.opened"] = "已打开 {number}。",
        ["grid-demo.filters.keys-hint"] = "按 Tab 进入表格，用方向键逐行移动，在某一行上按 Enter。",
        ["grid-demo.filters.pressed"] = "已从行打开 {number}。",
        ["grid-demo.source.past-due"] = "逾期，每月 €100 起",
        ["grid-demo.source.no-filters"] = "无筛选",
        ["grid-demo.source.not-asked"] = "数据源除首个窗口外尚未被请求。",
        ["grid-demo.source.edit-hint"] = "双击单元格即可编辑：写入经由数据源，数据源保存后重新读取该订阅。",
        ["grid-demo.source.row-gone"] = "第 {id} 行不在任一窗口中。",
        ["grid-demo.source.no-terms.other"] = "没有条件：数据源按自身顺序返回 {rows} 行。",
        ["grid-demo.source.matches.other"] = "{terms} — 服务器上有 {rows} 行匹配。"
    };

    public static IReadOnlyDictionary<string, IReadOnlyDictionary<string, string>> Build()
        => new Dictionary<string, IReadOnlyDictionary<string, string>>(StringComparer.Ordinal) { ["en"] = English, ["zh-Hans"] = Chinese };
}
