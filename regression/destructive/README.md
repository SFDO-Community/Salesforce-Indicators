Run this to delete CMDT records in the `destructiveChanges.xml` manifest

```bash
sf project deploy start \
--manifest regression/destructive/package.xml \
--pre-destructive-changes regression/destructive/preDestructiveChanges.xml \
--post-destructive-changes regression/destructive/postDestructiveChanges.xml
```
