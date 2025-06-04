import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notification.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import { NotificationTemplate } from './entities/notification-template.entity';
import { NotificationType } from './enums/notificationType.enum';
import { NotificationStatus } from './enums/notificationStatus.enum';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';

type MockRepository<T extends object = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const createMockRepository = <T extends object = any>(): MockRepository<T> => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  find: jest.fn(),
  createQueryBuilder: jest.fn(),
});

describe('NotificationsService', () => {
  let service: NotificationsService;
  let notificationRepo: MockRepository<Notification>;
  let prefRepo: MockRepository<NotificationPreference>;
  let templateRepo: MockRepository<NotificationTemplate>;
  let mailService: { sendEmail: jest.Mock };
  let pushService: { sendPush: jest.Mock };
  let emailChannel: { name: string; send: jest.Mock; sendBatch: jest.Mock };
  let pushChannel: { name: string; send: jest.Mock; sendBatch: jest.Mock };
  let smsChannel: { name: string; send: jest.Mock; sendBatch: jest.Mock };
  let queue: { add: jest.Mock };
  let eventEmitter: { emit: jest.Mock };

  beforeEach(() => {
    notificationRepo = createMockRepository<Notification>();
    prefRepo = createMockRepository<NotificationPreference>();
    templateRepo = createMockRepository<NotificationTemplate>();
    mailService = { sendEmail: jest.fn() };
    pushService = { sendPush: jest.fn() };
    emailChannel = { name: 'email', send: jest.fn(), sendBatch: jest.fn() };
    pushChannel = { name: 'push', send: jest.fn(), sendBatch: jest.fn() };
    smsChannel = { name: 'sms', send: jest.fn(), sendBatch: jest.fn() };
    queue = { add: jest.fn() };
    eventEmitter = { emit: jest.fn() };

    service = new NotificationsService(
      notificationRepo as any,
      prefRepo as any,
      templateRepo as any,
      eventEmitter as any,
      mailService as any,
      pushService as any,
      emailChannel as any,
      pushChannel as any,
      smsChannel as any,
      queue as any,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create default preferences if none exist and enqueue email', async () => {
    const dto = {
      userId: 'user-uuid',
      title: 'Test Title',
      content: 'Test Content',
      channel: 'email' as const,
    };
    const prefs = {
      userId: 'user-uuid',
      inApp: true,
      email: true,
      push: true,
      sms: true,
      transactionStatusChanges: true,
      transactionErrors: true,
      transactionConfirmations: true,
      securityAlerts: true,
      priceAlerts: true,
      portfolioUpdates: true,
      newsUpdates: true,
      systemAnnouncements: true,
      emailFrequency: 'immediate',
      pushFrequency: 'immediate',
      enableQuietHours: false,
      quietHoursExceptUrgent: false,
    };
    prefRepo.findOne!.mockResolvedValueOnce(undefined);
    prefRepo.create!.mockReturnValueOnce(prefs);
    prefRepo.save!.mockResolvedValueOnce(prefs);
    notificationRepo.create!.mockReturnValueOnce({ ...dto, status: NotificationStatus.PENDING });
    notificationRepo.save!.mockResolvedValueOnce({ id: 'notif-uuid', ...dto, status: NotificationStatus.PENDING });

    const result = await service.create(dto as any);

    expect(prefRepo.findOne).toHaveBeenCalledWith({ where: { userId: 'user-uuid' } });
    expect(prefRepo.create).toHaveBeenCalled();
    expect(prefRepo.save).toHaveBeenCalled();
    expect(notificationRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-uuid',
        title: 'Test Title',
        content: 'Test Content',
        channel: 'email',
        status: NotificationStatus.PENDING,
      }) as any,
    );
    expect(notificationRepo.save).toHaveBeenCalled();
    expect(queue.add).toHaveBeenCalledWith(
      'process-notification',
      { notificationId: 'notif-uuid' },
      expect.any(Object),
    );
    expect(eventEmitter.emit).toHaveBeenCalledWith('notification.created', {
      userId: 'user-uuid',
      notification: { id: 'notif-uuid', ...dto, status: NotificationStatus.PENDING },
    });
    expect(result).toEqual({ id: 'notif-uuid', ...dto, status: NotificationStatus.PENDING });
  });

  it('should return null when preferences disable the channel', async () => {
    const dto = {
      userId: 'user-uuid',
      title: 'Blocked',
      content: 'Blocked',
      channel: 'email' as const,
      type: NotificationType.SYSTEM,
    };
    const prefs = {
      userId: 'user-uuid',
      inApp: true,
      email: false,
      push: false,
      sms: false,
      transactionStatusChanges: false,
      transactionErrors: false,
      transactionConfirmations: false,
      securityAlerts: false,
      priceAlerts: false,
      portfolioUpdates: false,
      newsUpdates: false,
      systemAnnouncements: false,
      emailFrequency: 'immediate',
      pushFrequency: 'immediate',
      enableQuietHours: false,
      quietHoursExceptUrgent: false,
    };
    prefRepo.findOne!.mockResolvedValueOnce(prefs);

    const result = await service.create(dto as any);
    expect(result).toBeNull();
    expect(notificationRepo.create).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('should find all notifications with filters and pagination', async () => {
    const userId = 'user-uuid';
    const query = { type: NotificationType.TRANSACTION, read: false, search: 'foo', limit: 5, offset: 0 };
    const fakeQB: any = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(2),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([{ id: '1' }, { id: '2' }]),
    };
    notificationRepo.createQueryBuilder = jest.fn().mockReturnValue(fakeQB);

    const result = await service.findAll(userId, query as any);

    expect(notificationRepo.createQueryBuilder).toHaveBeenCalledWith('notification');
    expect(fakeQB.andWhere).toHaveBeenCalledWith(
      '(notification.title ILIKE :search OR notification.content ILIKE :search)',
      { search: '%foo%' },
    );
    expect(result).toEqual({ data: [{ id: '1' }, { id: '2' }], total: 2 });
  });

  it('should throw NotFoundException when updating non-existent notification', async () => {
    notificationRepo.findOne!.mockResolvedValueOnce(undefined);
    await expect(service.update('bad-id', 'user-uuid', {} as any)).rejects.toThrow(NotFoundException);
  });

  it('should update an existing notification via markAsRead', async () => {
    const existing = { id: 'n1', userId: 'user-uuid', read: false } as Notification;
    notificationRepo.findOne!.mockResolvedValueOnce(existing);
    notificationRepo.save!.mockResolvedValueOnce({ ...existing, read: true });

    const result = await service.markAsRead('n1', 'user-uuid');
    expect(notificationRepo.findOne).toHaveBeenCalledWith({ where: { id: 'n1', userId: 'user-uuid' } });
    expect(notificationRepo.save).toHaveBeenCalledWith({ ...existing, read: true });
    expect(result.read).toBe(true);
  });

  it('should create default preferences if none exist', async () => {
    prefRepo.findOne!.mockResolvedValueOnce(undefined);
    prefRepo.create!.mockReturnValueOnce({ userId: 'user-uuid' });
    prefRepo.save!.mockResolvedValueOnce({ userId: 'user-uuid' });

    const result = await service.getUserPreferences('user-uuid');
    expect(prefRepo.findOne).toHaveBeenCalledWith({ where: { userId: 'user-uuid' } });
    expect(prefRepo.create).toHaveBeenCalled();
    expect(prefRepo.save).toHaveBeenCalled();
    expect(result).toEqual({ userId: 'user-uuid' });
  });

  it('should enqueue push notification for delivery', async () => {
    const dto = {
      userId: 'user-uuid',
      title: 'Push Me',
      content: 'Push Content',
      channel: 'push' as const,
    };
    const prefs = {
      userId: 'user-uuid',
      inApp: true,
      email: true,
      push: true,
      sms: true,
      transactionStatusChanges: true,
      transactionErrors: true,
      transactionConfirmations: true,
      securityAlerts: true,
      priceAlerts: true,
      portfolioUpdates: true,
      newsUpdates: true,
      systemAnnouncements: true,
      emailFrequency: 'immediate',
      pushFrequency: 'immediate',
      enableQuietHours: false,
      quietHoursExceptUrgent: false,
    };
    prefRepo.findOne!.mockResolvedValueOnce(prefs);
    notificationRepo.create!.mockReturnValueOnce({ ...dto, status: NotificationStatus.PENDING });
    notificationRepo.save!.mockResolvedValueOnce({ id: 'push-uuid', ...dto, status: NotificationStatus.PENDING });

    const result = await service.create(dto as any);

    expect(queue.add).toHaveBeenCalledWith(
      'process-notification',
      { notificationId: 'push-uuid' },
      expect.any(Object),
    );
    expect(result).toEqual({ id: 'push-uuid', ...dto, status: NotificationStatus.PENDING });
  });

  it('should process notification with push channel', async () => {
    const notification = { id: 'n2', channel: 'push', retryCount: 0, status: NotificationStatus.PENDING } as Notification;
    notificationRepo.findOne!.mockResolvedValueOnce(notification);
    pushService.sendPush.mockResolvedValueOnce('push-id');
    notificationRepo.save!.mockResolvedValueOnce({ ...notification, status: NotificationStatus.SENT });

    await service.processNotification('n2');
    expect(pushService.sendPush).toHaveBeenCalledWith(notification);
    expect(notificationRepo.save).toHaveBeenCalledWith({ ...notification, status: NotificationStatus.SENT });
  });

  it('should process notification with sms channel', async () => {
    const notification = {
      id: 'n3',
      channel: 'sms',
      retryCount: 0,
      status: NotificationStatus.PENDING,
      metadata: { phoneNumber: '1234567890' },
    } as Notification;
    notificationRepo.findOne!.mockResolvedValueOnce(notification);
    smsChannel.send.mockResolvedValueOnce('sms-id');
    notificationRepo.save!.mockResolvedValueOnce({ ...notification, status: NotificationStatus.SENT });

    await service.processNotification('n3');
    expect(smsChannel.send).toHaveBeenCalledWith(notification);
    expect(notificationRepo.save).toHaveBeenCalledWith({ ...notification, status: NotificationStatus.SENT });
  });

  it('should retry on failure and increment retryCount', async () => {
    const notification = { id: 'n1', channel: 'email', retryCount: 1, status: NotificationStatus.PENDING } as Notification;
    notificationRepo.findOne!.mockResolvedValueOnce(notification);
    mailService.sendEmail.mockRejectedValueOnce(new Error('fail'));
    notificationRepo.save!.mockResolvedValueOnce({ ...notification, status: NotificationStatus.RETRYING, retryCount: 2 });

    await expect(service.processNotification('n1')).rejects.toThrow('fail');
    expect(notificationRepo.save).toHaveBeenCalledWith({
      ...notification,
      status: NotificationStatus.RETRYING,
      retryCount: 2,
    });
  });

  it('getChannelProvider should return correct channel instance', () => {
    expect(service.getChannelProvider('email')).toBe(emailChannel);
    expect(service.getChannelProvider('push')).toBe(pushChannel);
    expect(service.getChannelProvider('sms')).toBe(smsChannel);
  });

  it('should throw if getChannelProvider with unknown name', () => {
    expect(() => service.getChannelProvider('unknown' as any)).toThrow();
  });
});
