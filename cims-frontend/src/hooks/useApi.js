import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

/** Every mutation invalidates all entity lists, because records are cross-linked. */
const ALL_KEYS = ['contracts', 'pis', 'lcs', 'shipments', 'reports', 'users', 'lookups', 'settings'];

function useInvalidatingMutation(fn) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => ALL_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
  });
}

function entityHooks(key, service) {
  return {
    useList: () => useQuery({ queryKey: [key, 'list'], queryFn: () => service.list() }),
    useOne: (id) => useQuery({ queryKey: [key, 'one', id], queryFn: () => service.get(id), enabled: !!id }),
    useCreate: () => useInvalidatingMutation((data) => service.create(data)),
    useUpdate: () => useInvalidatingMutation(({ id, data }) => service.update(id, data)),
    useRemove: () => useInvalidatingMutation((id) => service.remove(id)),
  };
}

export const contractHooks = entityHooks('contracts', api.contracts);
export const piHooks = entityHooks('pis', api.pis);
export const shipmentHooks = entityHooks('shipments', api.shipments);

export const lcHooks = {
  useList: () => useQuery({ queryKey: ['lcs', 'list'], queryFn: () => api.lcs.list() }),
  useOne: (id) => useQuery({ queryKey: ['lcs', 'one', id], queryFn: () => api.lcs.get(id), enabled: !!id }),
  useCreateMany: () => useInvalidatingMutation(({ header, items }) => api.lcs.createMany(header, items)),
  useUpdate: () => useInvalidatingMutation(({ id, header, item }) => api.lcs.update(id, header, item)),
  useRemove: () => useInvalidatingMutation((id) => api.lcs.remove(id)),
};

export const userHooks = {
  useList: () => useQuery({ queryKey: ['users', 'list'], queryFn: () => api.users.list() }),
  useCreate: () => useInvalidatingMutation((data) => api.users.create(data)),
  useUpdate: () => useInvalidatingMutation(({ id, data }) => api.users.update(id, data)),
  useRemove: () => useInvalidatingMutation(({ id, currentUserId }) => api.users.remove(id, currentUserId)),
};

export const useVesselReport = () =>
  useQuery({ queryKey: ['reports', 'vessels'], queryFn: () => api.reports.vesselRows() });

export const useVesselDetail = (shipmentId) =>
  useQuery({
    queryKey: ['reports', 'vessel', shipmentId],
    queryFn: () => api.reports.vesselDetail(shipmentId),
    enabled: !!shipmentId,
  });

export const useLookups = () =>
  useQuery({ queryKey: ['lookups'], queryFn: () => api.lookups.get(), staleTime: 5 * 60_000 });
export const useUpdateLookups = () => useInvalidatingMutation((data) => api.lookups.update(data));

export const useSettings = () => useQuery({ queryKey: ['settings'], queryFn: () => api.settings.get() });
export const useUpdateSettings = () => useInvalidatingMutation((data) => api.settings.update(data));
