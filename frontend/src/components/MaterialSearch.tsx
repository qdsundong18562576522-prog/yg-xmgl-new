import { useState, useEffect, useRef } from 'react';
import { Select } from 'antd';
import type { SelectProps } from 'antd';
import { materialsApi } from '../api/materials';
import type { Material } from '../api/materials';

interface Props extends SelectProps {
  onMaterialSelect?: (material: Material) => void;
}

export default function MaterialSearch({ onMaterialSelect, ...rest }: Props) {
  const [options, setOptions] = useState<{ value: number; label: string; material: Material }[]>([]);
  const [search, setSearch] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const res: any = await materialsApi.findAll(search);
        const items = (res.data || []).map((m: Material) => ({
          value: m.id,
          label: `${m.name} / ${m.brand} / ${m.spec}`,
          material: m,
        }));
        setOptions(items);
      } catch { /* ignore */ }
    }, 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [search]);

  return (
    <Select
      showSearch
      allowClear
      placeholder="搜索材料设备"
      labelInValue={false}
      options={options}
      onSearch={setSearch}
      filterOption={false}
      onSelect={(_, option: any) => {
        if (onMaterialSelect && option.material) {
          onMaterialSelect(option.material);
        }
      }}
      style={{ width: '100%' }}
      {...rest}
    />
  );
}
