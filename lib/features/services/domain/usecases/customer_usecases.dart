import '../repositories/services_repository.dart';
import '../entities/service_customer.dart';

class GetCustomers {
  final IServicesRepository repository;
  GetCustomers(this.repository);

  Future<List<ServiceCustomer>> call({String? query}) {
    return repository.getCustomers(query: query);
  }
}

class CreateCustomer {
  final IServicesRepository repository;
  CreateCustomer(this.repository);

  Future<ServiceCustomer> call({
    required String name,
    String? phone,
    String? email,
  }) {
    return repository.createCustomer(
      name: name,
      phone: phone,
      email: email,
    );
  }
}
