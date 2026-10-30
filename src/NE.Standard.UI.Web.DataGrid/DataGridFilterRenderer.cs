using System;
using System.Collections.Generic;
using System.Globalization;
using NE.Standard.UI.Abstractions.Binding.Addresses;
using NE.Standard.UI.Abstractions.Identity;
using NE.Standard.UI.Authoring.Components;
using NE.Standard.UI.DataGrid;
using NE.Standard.UI.Web.Abstractions.Html;
using NE.Standard.UI.Web.Abstractions.Rendering;
using NE.Standard.UI.Web.Renderers.Foundation;

namespace NE.Standard.UI.Web.DataGrid;

/// <summary>
/// Renders one filter: property and kind for the engine, its surface and border, a title when it stands apart, and each field in its own part.
/// </summary>
public sealed class DataGridFilterRenderer : WebComponentRendererBase
{
    /// <summary>On the title a filter wears when it stands apart from its column.</summary>
    public const string TitleClassName = "ui-data-grid__filter-title";

    /// <summary>On each field's part: the one field of a text or choice filter, each end of a range.</summary>
    public const string PartClassName = "ui-data-grid__filter-part";

    public override string ComponentTypeKey => DataGridFilterComponent.ComponentTypeKey;

    protected override string ClassName => "ui-data-grid__filter";

    protected override void RenderComponent(WebRenderContext context, IHtmlElementBuilder root)
    {
        ArgumentNullException.ThrowIfNull(context);
        ArgumentNullException.ThrowIfNull(root);

        _ = ResolveRenderValue(context, DataGridFilterComponent.PropertyProperty, out string? property, out _);
        _ = ResolveRenderValue(context, DataGridFilterComponent.KindProperty, out UIDataGridColumnKind? kind, out _);
        _ = ResolveRenderValue(context, DataGridFilterComponent.TitleProperty, out string? title, out _);

        _ = root.Attribute(DataGridComponentRenderer.FilterAttribute, property ?? string.Empty);

        _ = root.Attribute(DataGridComponentRenderer.FilterKindAttribute, DataGridCellRenderer.KindName(kind ?? UIDataGridColumnKind.Text));

        // A container's chrome, as the core's containers draw theirs: the filter carries the blocks, so what it is given shows.
        ContainerStyleRenderer.RenderContainerStyle(context, root);

        if (!string.IsNullOrEmpty(title))
        {
            var titleId = $"ui-data-grid-filter-title-{context.Node.ComponentId.Value.ToString(CultureInfo.InvariantCulture)}";

            _ = root.Attribute("role", "group");
            _ = root.Attribute("aria-labelledby", titleId);
            _ = root.Element("span", span =>
            {
                _ = span.Class(TitleClassName);
                _ = span.Attribute("id", titleId);
                // Marked with the author's key, not the words the render already translated it to, so a language switch finds it.
                _ = WriteRenderWord(context, span, null, DataGridFilterComponent.TitleProperty);
            });
        }

        IReadOnlyList<UIComponentId> children = context.ViewResolution.View.Graph.GetChildren(context.Node.ComponentId);

        for (var i = 0; i < children.Count; i++)
        {
            UIComponentId child = children[i];
            var bound = children.Count > 1 ? (i == 0 ? "from" : "to") : null;

            // The field's value is the client's to clear: the panel's clear button empties every filter the way a push would.
            context.Metadata.ExposeProperty(new UIPropertyAddress(child, IInputComponent.ValueProperty));

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
