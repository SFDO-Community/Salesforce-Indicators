"""Deploy task that adjusts namespaced Apex datasources for non-namespaced orgs.

LWC `.js-meta.xml` files hardcode the package namespace in Apex datasources, e.g.
`datasource="apex://inds.IndicatorListBundleSelector"`, because package version
creation replaces `%%%NAMESPACE_DOT%%%` with an empty string. A non-namespaced
org needs the prefix removed, which the `find_replace` transform can't do: in XML
it changes element text, not attributes.

Package version creation does not use this task, so packages keep the prefix.
"""

from cumulusci.core.source_transforms.transforms import SourceTransform
from cumulusci.tasks.salesforce import Deploy
from cumulusci.utils.ziputils import process_text_in_zipfile


class StripDatasourceNamespace(SourceTransform):
    """Removes the `<namespace>.` prefix from Apex datasources in LWC metadata."""

    identifier = "strip_datasource_namespace"

    def __init__(self, namespace):
        self.find = f'datasource="apex://{namespace}.'

    def process(self, zf, context):
        def strip(name, content):
            if name.endswith(".js-meta.xml") and self.find in content:
                context.logger.info(f"  {name}: removed namespace from Apex datasource")
                content = content.replace(self.find, 'datasource="apex://')
            return name, content

        return process_text_in_zipfile(zf, strip)


class DeployWithDatasourceNamespace(Deploy):
    """CumulusCI Deploy that keeps namespaced Apex datasources only for namespaced orgs."""

    # _get_package_zip is internal to CumulusCI: recheck this override when upgrading.
    def _get_package_zip(self, path):
        namespace = self.options["namespace_inject"]
        if not namespace or self._is_namespaced_org(namespace):
            return super()._get_package_zip(path)

        configured_transforms = self.transforms
        self.transforms = [*configured_transforms, StripDatasourceNamespace(namespace)]
        try:
            return super()._get_package_zip(path)
        finally:
            self.transforms = configured_transforms
