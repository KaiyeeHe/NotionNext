import BLOG from "@/blog.config"

/**
 * Extract page IDs from a specific view data structure
 * Supports multiple Notion view types: Table, List, Gallery, Board, Calendar, Timeline, Feed
 */
function extractPageIdsFromView(viewData) {
  if (!viewData) return []

  const pageIds = []

  // Method 1: collection_group_results.blockIds (Table, List, Gallery, Board views)
  if (viewData.collection_group_results?.blockIds) {
    pageIds.push(...viewData.collection_group_results.blockIds)
  }

  // Method 2: blockIds directly (some grouped views, Feed view)
  if (viewData.blockIds) {
    pageIds.push(...viewData.blockIds)
  }

  // Method 3: Calendar view - results stored by date ranges
  if (viewData.calendar_by?.type === 'week' || viewData.calendar_by?.type === 'month') {
    // Calendar views group by time periods
    Object.values(viewData).forEach(value => {
      if (value?.blockIds) {
        pageIds.push(...value.blockIds)
      }
      if (value?.collection_group_results?.blockIds) {
        pageIds.push(...value.collection_group_results.blockIds)
      }
    })
  }

  // Method 4: Timeline view
  if (viewData.timeline_by) {
    Object.values(viewData).forEach(value => {
      if (value?.blockIds) {
        pageIds.push(...value.blockIds)
      }
      if (value?.collection_group_results?.blockIds) {
        pageIds.push(...value.collection_group_results.blockIds)
      }
    })
  }

  // Method 5: Feed view - chronological feed layout
  // Feed views typically store data in feed_results or similar structures
  if (viewData.feed_results?.blockIds) {
    pageIds.push(...viewData.feed_results.blockIds)
  }

  // Method 6: Check for any nested result structures (covers edge cases)
  // This handles Feed and other potential future view types
  if (pageIds.length === 0 && typeof viewData === 'object') {
    Object.keys(viewData).forEach(key => {
      if (key.includes('results') || key.includes('group')) {
        const nestedData = viewData[key]
        if (nestedData?.blockIds) {
          pageIds.push(...nestedData.blockIds)
        }
        // Handle deeply nested structures
        if (typeof nestedData === 'object' && nestedData !== null) {
          Object.values(nestedData).forEach(value => {
            if (value?.blockIds) {
              pageIds.push(...value.blockIds)
            }
          })
        }
      }
    })
  }

  return [...new Set(pageIds)] // Remove duplicates
}

export default function getAllPageIds(collectionQuery, collectionId, collectionView, viewIds) {
  if (!collectionQuery && !collectionView) {
    return []
  }

  let pageIds = []

  try {
    // Notion数据库中的第几个视图用于站点展示和排序：
    const groupIndex = BLOG.NOTION_INDEX || 0

    if (viewIds && viewIds.length > 0 && collectionQuery[collectionId]) {
      const targetViewId = viewIds[groupIndex]
      const viewData = collectionQuery[collectionId][targetViewId]

      if (viewData) {
        pageIds = extractPageIdsFromView(viewData)

        if (pageIds.length > 0) {
          console.log(`[getAllPageIds] Extracted ${pageIds.length} pages from view ${groupIndex + 1} (${targetViewId})`)
        }
      }
    }
  } catch (error) {
    console.error('[getAllPageIds] Error fetching page IDs from specific view:', error);
  }

  // 否则按照数据库原始排序 - fallback to all views
  if (pageIds.length === 0 && collectionQuery && Object.values(collectionQuery).length > 0) {
    const pageSet = new Set()

    Object.values(collectionQuery[collectionId] || {}).forEach(view => {
      const extractedIds = extractPageIdsFromView(view)
      extractedIds.forEach(id => pageSet.add(id))
    })

    pageIds = [...pageSet]
    console.log(`[getAllPageIds] Fallback: Extracted ${pageIds.length} pages from all views`)
  }

  return pageIds
}
