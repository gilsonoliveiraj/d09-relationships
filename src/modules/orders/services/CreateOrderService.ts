import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Invalid customer id');
    }

    const productsIds = products.map(p => {
      return { id: p.id };
    });

    const productsArr = await this.productsRepository.findAllById(productsIds);

    const parsedProducts = productsArr.map(p => {
      const productRequested = products.find(product => product.id === p.id);

      if (p.quantity - (productRequested?.quantity || 0) < 0) {
        throw new AppError(`sem estoque suficiente do produto ${p.name}`);
      }
      return {
        product_id: p.id,
        price: p.price,
        quantity: productRequested?.quantity || 0,
      };
    });

    const order = this.ordersRepository.create({
      customer,
      products: parsedProducts,
    });

    this.productsRepository.updateQuantity(products);

    return order;
  }
}

export default CreateOrderService;
