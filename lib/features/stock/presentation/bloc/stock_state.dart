import 'package:equatable/equatable.dart';
import '../../domain/entities/item.dart';

// Events
abstract class StockEvent extends Equatable {
  @override
  List<Object?> get props => [];
}

class LoadItems extends StockEvent {}

class AddStockItem extends StockEvent {
  final Item item;
  AddStockItem(this.item);
  @override
  List<Object?> get props => [item];
}

class UpdateStockItem extends StockEvent {
  final Item item;
  UpdateStockItem(this.item);
  @override
  List<Object?> get props => [item];
}

class DeleteStockItem extends StockEvent {
  final int id;
  DeleteStockItem(this.id);
  @override
  List<Object?> get props => [id];
}

// States
abstract class StockState extends Equatable {
  @override
  List<Object?> get props => [];
}

class StockInitial extends StockState {}

class StockLoading extends StockState {}

class StockLoaded extends StockState {
  final List<Item> items;
  StockLoaded(this.items);
  @override
  List<Object?> get props => [items];
}

class StockError extends StockState {
  final String message;
  StockError(this.message);
  @override
  List<Object?> get props => [message];
}
