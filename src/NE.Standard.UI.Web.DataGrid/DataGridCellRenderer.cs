using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text.Json;
using NE.Standard.UI.Abstractions.Items;
using NE.Standard.UI.DataGrid;
using NE.Standard.UI.Web.Abstractions.Html;
using NE.Standard.UI.Web.Abstractions.Rendering;
using NE.Standard.UI.Web.Renderers.Foundation;

namespace NE.Standard.UI.Web.DataGrid;

/// <summary>
/// Renders a typed cell: kind, format, currency and captions as attributes the client reads back, and the value as text —
/// formatted here for a painted row, by the client's DOM operation otherwise.
/// </summary>
public sealed class DataGridCellRenderer : WebComponentRendererBase
{
    /// <summary>The operation the value travels through; the client formats by the attributes on the target.</summary>
    public const string ValueOperationKind = "data-grid-cell";

    /// <summary>On a typed cell: the kind it holds, as <see cref="KindName"/> writes it.</summary>
    public const string KindAttribute = "data-ui-grid-kind";

    /// <summary>On a typed cell: its number format or date pattern, when the column names one.</summary>
    public const string FormatAttribute = "data-ui-grid-format";

    /// <summary>On a money cell: the symbol it writes in place of the page's own.</summary>
    public const string CurrencyAttribute = "data-ui-grid-currency";

    /// <summary>On an enum or boolean cell: its choices' translated captions by value, as JSON.</summary>
    public const string ChoicesAttribute = "data-ui-grid-choices";

    /// <summary>On a number or money cell: the value as an invariant number — a numeric text's too — for a footer's total to add up on the client.</summary>
    public const string RawValueAttribute = "data-ui-grid-raw";

    private static readonly JsonSerializerOptions ChoicesJsonOptions = WebWireJson.CreateOptions();

    public override string ComponentTypeKey => DataGridCellComponent.ComponentTypeKey;

    protected override string ClassName => "ui-data-grid-cell";

    protected override void RenderComponent(WebRenderContext context, IHtmlElementBuilder root)
    {
        ArgumentNullException.ThrowIfNull(context);
        ArgumentNullException.ThrowIfNull(root);

        UIDataGridColumnKind kind = ReadRenderValue(context, DataGridCellComponent.KindProperty, UIDataGridColumnKind.Text);
        var format = ReadRenderValue<string?>(context, DataGridCellComponent.FormatProperty, null);
        var currency = ReadRenderValue<string?>(context, DataGridCellComponent.CurrencyProperty, null);
        IReadOnlyList<UIChoice>? choices = ReadRenderValue<IReadOnlyList<UIChoice>?>(context, DataGridCellComponent.ChoicesProperty, null);
        var kindName = KindName(kind);

        _ = root.Class($"{ClassName}--{kindName}");
        _ = root.Attribute(KindAttribute, kindName);

        if (!string.IsNullOrEmpty(format))
            _ = root.Attribute(FormatAttribute, format);

        if (!string.IsNullOrEmpty(currency))
            _ = root.Attribute(CurrencyAttribute, currency);

        if (choices is { Count: > 0 })
            _ = root.Attribute(ChoicesAttribute, JsonSerializer.Serialize(TranslateChoices(context, choices), ChoicesJsonOptions));

        // The page's culture, the same one the grid wrote its packs from; a cell painted here and one the client builds agree.
        CultureInfo culture = ResolveCulture(context);

        _ = RenderProperty<object?>(context, root, DataGridCellComponent.ValueProperty, (target, value) =>
        {
            _ = target.Text(DataGridCellFormatter.Format(value, kind, format, currency, choices, culture, context.Translate));

            if (kind is UIDataGridColumnKind.Number or UIDataGridColumnKind.Money && DataGridCellFormatter.RawNumber(value) is { } raw)
                _ = target.Attribute(RawValueAttribute, raw);
        }, [WebDomOperation.Custom(ValueOperationKind)]);
    }

    /// <summary>The kind as the client names it: the enum member, lower-cased.</summary>
    public static string KindName(UIDataGridColumnKind kind)
        => kind.ToString().ToLowerInvariant();

    private static Dictionary<string, string> TranslateChoices(WebRenderContext context, IReadOnlyList<UIChoice> choices)
    {
        Dictionary<string, string> captions = new(choices.Count, StringComparer.Ordinal);

        for (var i = 0; i < choices.Count; i++)
            captions[choices[i].Value] = context.Translate(choices[i].Caption);

        return captions;
    }
}
