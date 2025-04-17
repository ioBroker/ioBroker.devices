export function getChannelItems(
    objects: Record<string, ioBroker.Object>,
    channelId: string,
    _sortedKeys?: string[],
): string[] {
    _sortedKeys = _sortedKeys || Object.keys(objects).sort();
    const channelPrefix = `${channelId}.`;
    const channelPrefixEnd = `${channelId}.\u9999`;
    const result = [];
    for (let i = 0; i < _sortedKeys.length; i++) {
        const id = _sortedKeys[i];
        if (id < channelPrefix) {
            // ignore
        } else if (id > channelPrefixEnd) {
            break;
        } else if (id.startsWith(channelPrefix)) {
            result.push(id);
        }
    }

    return result;
}
