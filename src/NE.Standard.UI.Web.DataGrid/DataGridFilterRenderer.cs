using System;
using System.Collections.Generic;
using NE.Standard.UI.Abstractions.Identity;
using NE.Standard.UI.DataGrid;
using NE.Standard.UI.Web.Abstractions.Html;
using NE.Standard.UI.Web.Abstractions.Rendering;
using NE.Standard.UI.Web.Renderers.Foundation;

namespace NE.Standard.UI.Web.DataGrid;

/// <summary>
/// Renders one filter: property and kind for the engine, a caption when it stands apart from its column, and each field in its
/// own part — from and to, when there are two.
/// </summary>
public sealed class DataGridFilterRenderer : WebComponentRendererBase
{
    public const string CaptionClassName = "ui-data-grid__filter-caption";
    public const string PartClassName = "ui-data-grid__filter-part";

    public override string ComponentTypeKey => DataGridFilterComponent.ComponentTypeKey;

    protected override string ClassName => "ui-data-grid__filter";

    protected override void RenderComponent(WebRenderContext context, IHtmlElementBuilder root)
    {
        ArgumentNullException.ThrowIfNull(context);
        ArgumentNullException.ThrowIfNull(root);

        _ = ResolveRenderValue(context, DataGridFilterComponent.PropertyProperty, out string? property, out _);
        _ = ResolveRenderValue(context, DataGridFilterComponent.KindProperty, out UIDataGridColumnKind? kind, out _);
        _ = ResolveRenderValue(context, DataGridFilterComponent.CaptionProperty, out string? caption, out _);

        if (!string.IsNullOrEmpty(property))
            _ = root.Attribute(DataGridComponentRenderer.FilterAttribute, property);

        _ = root.Attribute(DataGridComponentRenderer.FilterKindAttribute, DataGridCellRenderer.KindName(kind ?? UIDataGridColumnKind.Text));

        if (!string.IsNullOrEmpty(caption))
        {
            _ = root.Element("span", span =>
            {
                _ = span.Class(CaptionClassName);
                _ = span.Text(context.Translate(caption));
            });
        }

        IReadOnlyList<UIComponentId> children = context.ViewResolution.View.Graph.GetChildren(context.Node.ComponentId);

        for (var i = 0; i < children.Count; i++)
        {
            UIComponentId child = children[i];
            var bound = children.Count > 1 ? (i == 0 ? "from" : "to") : null;

            _ = root.Element("div", part =>
            {
                _ = part.Class(PartClassName);

                if (bound is not null)
                    _ = part.Attribute(DataGridComponentRenderer.FilterBoundAttribute, bound);

                context.Renderer.RenderComponent(context.ForHtml(part), child);
            });
        }
    }
}
