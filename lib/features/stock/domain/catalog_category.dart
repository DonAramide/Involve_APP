import 'entities/category.dart';
import 'entities/item.dart';

/// Label used to group a fee or product when the catalog has no linked category.
String catalogCategoryLabel(Item item, List<Category> categories) {
  if (item.categoryId != null) {
    for (final category in categories) {
      if (category.id == item.categoryId && category.name.trim().isNotEmpty) {
        return category.name;
      }
    }
  }
  final name = item.name.toLowerCase();
  if (name.contains('rice') || name.contains('beans') || name.contains('food')) {
    return 'Grains & Food';
  }
  if (name.contains('book') || name.contains('fee') || name.contains('tuition')) {
    return 'Education';
  }
  return 'General Store';
}
