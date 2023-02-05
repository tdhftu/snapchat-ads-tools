import _ from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Column } from 'react-table';
import Layout from '@components/layout';
import AccessDenied from '@components/AccessDenied';
import { AdAccountDTO } from '@models/AdAccount';
import useTable from '@hooks/useTable';
import { CampaignDTO, CampaignCreateDTO } from '@models/Campaign';
import CampaignModal from '@components/CampaignModal';
import { AdSquadCreateDTO, AdSquadDTO } from '@models/AdSquad';
import { CreativeDTO } from '@models/Creative';
import { AdsCreateDTO, AdsDTO } from '@models/Ads';
import {
  EAdSquadType,
  EAdType,
  EBidStrategy,
  EDeliveryConstraint,
  EObjective,
  EOptimizationGoal,
  EStatus,
} from '@models/enums';

interface AdAccountWithAction extends AdAccountDTO {
  _status: 'text-neutral-500' | 'text-neutral-800' | 'text-red-500' | 'text-emerald-500';
  _statusMessage: string;
}

export default function AdAccountsPage() {
  const { data: session } = useSession();
  const [isLoading, setLoading] = useState(false);
  const [isAccountLoading, setIsAccountLoading] = useState(false);
  const [accounts, setAccounts] = useState<AdAccountWithAction[]>([]);
  const [organizationID, setOrganizationID] = useState('');
  const [organizations, setOrganizations] = useState([]);
  const [viewCampaignCtx, setViewCampaignCtx] = useState<{
    loading: boolean;
    ad_account_id: string | null;
    campaigns: CampaignDTO[];
    modalID: string;
  }>({
    loading: false,
    ad_account_id: null,
    campaigns: [],
    modalID: 'view-campaign-modal',
  });

  useEffect(() => {
    setLoading(true);
    fetch(`/api/organizations`)
      .then((response) => {
        if (response.status === 200) {
          return response.json();
        }
        throw new Error(response.statusText);
      })
      .then((data) => {
        const orgs = _.get(data, 'organizations', []);
        setOrganizations(orgs.map(({ organization }: any) => organization));
        setLoading(false);
      })
      .catch((error) => {
        setLoading(false);
        alert(error.message);
      });
  }, []);

  useEffect(() => {
    setIsAccountLoading(true);
    if (organizationID) {
      fetch(`/api/organizations/${organizationID}/adaccounts`)
        .then((response) => {
          if (response.status === 200) {
            return response.json();
          }
          throw new Error(response.statusText);
        })
        .then((data) => {
          setAccounts(
            data.adaccounts.map(
              ({ adaccount }: any) =>
                ({
                  ...adaccount,
                  _status: 'text-neutral-500',
                  _statusMessage: 'No action',
                } as AdAccountWithAction),
            ),
          );
          setIsAccountLoading(false);
        })
        .catch((error) => {
          setIsAccountLoading(false);
          // alert(error.message);
        });
    }
  }, [organizationID]);

  useEffect(() => {
    if (viewCampaignCtx.ad_account_id) {
      setViewCampaignCtx((pre) => ({ ...pre, loading: true }));

      fetch(`/api/adaccounts/${viewCampaignCtx.ad_account_id}/campaigns`)
        .then((response) => {
          if (response.status === 200) {
            return response.json();
          }
          throw new Error(response.statusText);
        })
        .then((data) => {
          const campaigns = data.campaigns.map(({ campaign }: any) => campaign as CampaignDTO);
          setViewCampaignCtx((pre) => ({ ...pre, campaigns, loading: false }));
        })
        .catch((error) => {
          setViewCampaignCtx((pre) => ({ ...pre, campaigns: [], loading: false }));
        });
    }
  }, [viewCampaignCtx.ad_account_id]);

  const onViewCampaign = (ad_account_id: string): void => {
    setViewCampaignCtx((pre) => ({ ...pre, ad_account_id }));
  };

  const onSelectOrg = (event: any) => {
    setOrganizationID(event.target.value);
  };

  const columns: Column<AdAccountWithAction>[] = useMemo(
    () => [
      { Header: 'Name', accessor: 'name', sortType: 'basic' },
      {
        Header: 'Status',
        accessor: 'status',
        sortType: 'basic',
        Cell: ({ value }) => (
          <div className={`badge badge-outline ${value === 'ACTIVE' ? 'badge-success' : ''}`}>{value}</div>
        ),
      },
      { Header: 'Currency', accessor: 'currency', Cell: ({ value }) => <div className="badge">{value}</div> },
      {
        Header: 'Campaigns',
        Cell: ({ row: { original } }: { row: { original: AdAccountWithAction } }) => {
          return (
            <label
              htmlFor="view-campaign-modal"
              className="btn btn-ghost btn-xs"
              onClick={() => onViewCampaign(original.id)}
            >
              View
            </label>
          );
        },
      },
      {
        Header: 'Actions',
        accessor: '_statusMessage',
        Cell: ({ value, row }) => <p className={`w-full ${row.original._status}`}>{value}</p>,
      },
    ],
    [],
  );

  const { renderTable, selectedFlatRows } = useTable({
    columns,
    data: accounts,
  });

  const handleSubmit = async (event: any) => {
    event.preventDefault();

    const ad_account_ids = selectedFlatRows.map((account: AdAccountDTO) => account.id);

    // Campaign data
    const campaign_name: string = event.target.campaign_name.value;
    const campaign_objective: EObjective = event.target.campaign_objective.value;
    const campaign_status: EStatus = event.target.campaign_status.value;
    const campaign_start_time = event.target.campaign_start_time.value
      ? new Date(event.target.campaign_start_time.value).toISOString()
      : undefined;
    const campaign_end_time = event.target.campaign_end_time.value
      ? new Date(event.target.campaign_end_time.value).toISOString()
      : undefined;
    const campaign_daily_budget_micro = event.target.campaign_daily_budget_micro.value
      ? Number(event.target.campaign_daily_budget_micro.value)
      : undefined;
    const campaign_lifetime_spend_cap_micro = event.target.campaign_lifetime_spend_cap_micro.value
      ? Number(event.target.campaign_lifetime_spend_cap_micro.value)
      : undefined;

    // Ad Squad data
    const ad_squad_name: string = event.target.ad_squad_name.value;
    const ad_squad_status: EStatus = event.target.ad_squad_status.value;
    const ad_squad_daily_budget_micro: number = event.target.ad_squad_daily_budget_micro.value;
    const ad_squad_delivery_constraint: EDeliveryConstraint = event.target.ad_squad_delivery_constraint.value;
    const ad_squad_start_time = event.target.ad_squad_start_time.value
      ? new Date(event.target.ad_squad_start_time.value).toISOString()
      : undefined;
    const ad_squad_end_time = event.target.ad_squad_end_time.value
      ? new Date(event.target.ad_squad_end_time.value).toISOString()
      : undefined;
    const ad_squad_age_min_age: number = event.target.ad_squad_age_min_age.value;
    const ad_squad_age_max_age: number = event.target.ad_squad_age_max_age.value;
    const ad_squad_gender: 'MALE' | 'FEMALE' | 'ALL' = event.target.ad_squad_gender.value;
    const ad_squad_os_type: 'iOS' | 'Android' = event.target.ad_squad_os_type.value;
    const ad_squad_connection_type: 'CELL' | 'WIFI' | 'ALL' = event.target.ad_squad_connection_type.value;
    const ad_squad_placement_v2 = { config: 'AUTOMATIC' };

    const ad_squad_type = EAdSquadType.SNAP_ADS;
    const ad_squad_auto_bid = true;
    const ad_squad_target_bid = false;
    const ad_squad_bid_strategy = EBidStrategy.AUTO_BID;
    const ad_squad_billing_event = 'IMPRESSION';
    const ad_squad_child_ad_type = 'REMOTE_WEBPAGE';
    const ad_squad_optimization_goal = EOptimizationGoal.SWIPES;
    // TOD: Validate the form inputs
    if (ad_account_ids.length === 0) {
      return;
    }

    for await (const ad_account_id of ad_account_ids) {
      const campaignPayload: CampaignCreateDTO = {
        ad_account_id,
        name: campaign_name,
        objective: campaign_objective,
        status: campaign_status,
        daily_budget_micro: campaign_daily_budget_micro,
        end_time: campaign_end_time,
        lifetime_spend_cap_micro: campaign_lifetime_spend_cap_micro,
        start_time: campaign_start_time,
      };

      const adSquadPayload: AdSquadCreateDTO = {
        campaign_id: '',
        name: ad_squad_name,
        status: ad_squad_status,
        start_time: ad_squad_start_time,
        end_time: ad_squad_end_time,
        type: ad_squad_type,
        bid_strategy: ad_squad_bid_strategy,
        billing_event: ad_squad_billing_event,
        auto_bid: ad_squad_auto_bid,
        target_bid: ad_squad_target_bid,
        child_ad_type: ad_squad_child_ad_type,
        optimization_goal: ad_squad_optimization_goal,
        delivery_constraint: ad_squad_delivery_constraint,
        daily_budget_micro: ad_squad_daily_budget_micro,
        placement_v2: ad_squad_placement_v2,
        targeting: {
          demographics: [
            {
              gender: ad_squad_gender === 'ALL' ? undefined : ad_squad_gender,
              max_age: ad_squad_age_max_age,
              min_age: ad_squad_age_min_age,
            },
          ],
          devices: [
            {
              os_type: ad_squad_os_type,
              connection_type: ad_squad_connection_type === 'ALL' ? undefined : ad_squad_connection_type,
            },
          ],
          geos: [
            {
              country_code: 'us',
            },
          ],
        },
      };

      await createCampaign(campaignPayload, adSquadPayload);
    }
  };

  const createCampaign = async (
    campaignPayload: CampaignCreateDTO,
    adSquadPayload: AdSquadCreateDTO,
  ): Promise<void> => {
    setAccounts((pre) =>
      pre.map((preAccount) => {
        if (preAccount.id !== campaignPayload.ad_account_id) {
          return preAccount;
        }
        return {
          ...preAccount,
          _status: 'text-neutral-800',
          _statusMessage: 'Creating new campaign...',
        };
      }),
    );

    const JSONdata = JSON.stringify(campaignPayload);
    const endpoint = '/api/campaigns/create';
    const options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSONdata };
    const response = await fetch(endpoint, options);
    const result = await response.json();
    const createdCampaign = _.get(result, 'campaigns[0].campaign', null);

    if (createdCampaign?.id) {
      await createAdSquad(campaignPayload.ad_account_id, { ...adSquadPayload, campaign_id: createdCampaign.id });
    } else {
      const _statusMessage = _.get(result, 'campaigns[0].sub_request_error_reason') || 'Create campaign failed';

      setAccounts((pre) =>
        pre.map((preAccount) => {
          if (preAccount.id !== campaignPayload.ad_account_id) {
            return preAccount;
          }
          return {
            ...preAccount,
            _status: 'text-red-500',
            _statusMessage,
          };
        }),
      );
    }
  };

  const createAd = async (ad_squad_id: string, creative: CreativeDTO): Promise<void> => {
    setAccounts((pre) =>
      pre.map((preAccount) => {
        if (preAccount.id !== creative.ad_account_id) {
          return preAccount;
        }
        return {
          ...preAccount,
          _status: 'text-neutral-800',
          _statusMessage: 'Creating new ads...',
        };
      }),
    );

    const payload: AdsCreateDTO = {
      ad_squad_id,
      creative_id: creative.id,
      name: creative.headline,
      status: EStatus.ACTIVE,
      type: EAdType.REMOTE_WEBPAGE,
    };

    const JSONdata = JSON.stringify(payload);
    const endpoint = '/api/ads/create';
    const options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSONdata };
    const response = await fetch(endpoint, options);
    const result = await response.json();
    const createdAd: AdsDTO | null = _.get(result, 'ads[0].ad', null);

    if (createdAd) {
      setAccounts((pre) =>
        pre.map((preAccount) => {
          if (preAccount.id !== creative.ad_account_id) {
            return preAccount;
          }
          return {
            ...preAccount,
            _status: 'text-neutral-500',
            _statusMessage: 'Done',
          };
        }),
      );
    } else {
      const _statusMessage = _.get(result, 'ads[0].sub_request_error_reason') || 'Create campaign failed';
      setAccounts((pre) =>
        pre.map((preAccount) => {
          if (preAccount.id !== creative.ad_account_id) {
            return preAccount;
          }
          return {
            ...preAccount,
            _status: 'text-red-500',
            _statusMessage,
          };
        }),
      );
    }
  };

  const getCreatives = async (ad_account_id: string, ad_squad_id: string): Promise<void> => {
    setAccounts((pre) =>
      pre.map((preAccount) => {
        if (preAccount.id !== ad_account_id) {
          return preAccount;
        }
        return {
          ...preAccount,
          _status: 'text-neutral-800',
          _statusMessage: 'Getting creatives...',
        };
      }),
    );

    const endpoint = `/api/adaccounts/${ad_account_id}/creatives`;
    const options = { method: 'POST', headers: { 'Content-Type': 'application/json' } };
    const response = await fetch(endpoint, options);
    const result = await response.json();
    const creative: CreativeDTO | null = _.get(result, 'creatives[0].creative', null);

    if (creative) {
      await createAd(ad_squad_id, creative);
    } else {
      const _statusMessage = _.get(result, 'creatives[0].sub_request_error_reason') || 'No creative to create ads';
      setAccounts((pre) =>
        pre.map((preAccount) => {
          if (preAccount.id !== ad_account_id) {
            return preAccount;
          }
          return {
            ...preAccount,
            _status: 'text-red-500',
            _statusMessage,
          };
        }),
      );
    }
  };

  const createAdSquad = async (ad_account_id: string, payload: AdSquadCreateDTO): Promise<void> => {
    setAccounts((pre) =>
      pre.map((preAccount) => {
        if (preAccount.id !== ad_account_id) {
          return preAccount;
        }
        return {
          ...preAccount,
          _status: 'text-neutral-800',
          _statusMessage: 'Creating new adSquad...',
        };
      }),
    );

    const JSONdata = JSON.stringify(payload);
    const endpoint = '/api/adsquads/create';
    const options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSONdata };
    const response = await fetch(endpoint, options);
    const result = await response.json();

    const newAdSquad: AdSquadDTO = _.get(result, 'adsquads[0].adsquad', null);
    if (newAdSquad) {
      await getCreatives(ad_account_id, newAdSquad?.id);
    } else {
      const _statusMessage = _.get(result, 'adsquads[0].sub_request_error_reason') || 'Create adSquad failed';

      setAccounts((pre) =>
        pre.map((preAccount) => {
          if (preAccount.id !== ad_account_id) {
            return preAccount;
          }
          return {
            ...preAccount,
            _status: 'text-red-500',
            _statusMessage,
          };
        }),
      );
    }
  };

  const selectedAccountNames = useMemo(
    () => selectedFlatRows?.map((acc: AdAccountDTO) => acc.name)?.join(', ') || '',
    [selectedFlatRows],
  );

  const disabledSubmit = useMemo(() => selectedFlatRows.length === 0, [selectedFlatRows]);

  const selectedOrgName = useMemo(() => {
    const selectOrg: any = organizations.find((org: any) => org.id === organizationID);
    return selectOrg?.name || '';
  }, [organizationID, organizations]);

  if (!session) {
    return (
      <Layout>
        <AccessDenied />
      </Layout>
    );
  }

  const CampaignSection = (
    <div className="bg-stone-300 gap-2 p-4 rounded-lg">
      <p className="text-2xl">Campaign Details</p>
      <span className="label label-text">Name (Required)</span>
      <input type="text" id="campaign_name" placeholder="Name" className="input input-bordered input-sm w-full" />

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col">
          <span className="label label-text">Objective (Required)</span>
          <select className="select select-bordered select-sm" id="campaign_objective">
            <option value="WEB_CONVERSION">WEB CONVERSION</option>
            <option value="BRAND_AWARENESS">BRAND AWARENESS</option>
          </select>
        </div>
        <div className="flex flex-col">
          <span className="label label-text">Status (Required)</span>
          <select className="select select-bordered select-sm" id="campaign_status">
            <option value="ACTIVE">ACTIVE</option>
            <option value="PAUSED">PAUSED</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <span className="label label-text">Start time (Required)</span>
          <input type="datetime-local" id="campaign_start_time" className="input input-bordered input-sm w-full" />
        </div>
        <div className="flex-1">
          <span className="label label-text">End time (Optional)</span>
          <input type="datetime-local" id="campaign_end_time" className="input input-bordered input-sm w-full" />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <span className="label label-text">Daily Spend Cap (Optional)</span>
          <input
            type="number"
            id="campaign_daily_budget_micro"
            placeholder="E.g. 5 000 000 => $5"
            className="input input-bordered input-sm w-full"
          />
        </div>
        <div className="flex-1">
          <span className="label label-text">Lifetime Spend Cap (Optional)</span>
          <input
            type="number"
            id="campaign_lifetime_spend_cap_micro"
            placeholder="E.g. 5 000 000 => $5"
            className="input input-bordered input-sm w-full"
          />
        </div>
      </div>
      <div className="flex-1">
        <p className="text-1xl pt-4 pb-2">Ad Accounts ({selectedFlatRows.length} selected)</p>
        <textarea
          placeholder="Name of selected ad accounts"
          className="textarea w-full"
          disabled
          value={selectedAccountNames}
        />
      </div>
    </div>
  );

  const AdSquadSection = (
    <div className="bg-stone-300 gap-2 p-4 rounded-lg">
      <p className="text-2xl">Ad Set Details</p>
      <span className="label label-text">Ad Set Name (Required)</span>
      <input
        type="text"
        id="ad_squad_name"
        placeholder="Ad Set Name"
        className="input input-bordered input-sm w-full"
      />
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col">
          <span className="label label-text">Status (Required)</span>
          <select className="select select-bordered select-sm" id="ad_squad_status">
            <option value="ACTIVE">ACTIVE</option>
            <option value="PAUSED">PAUSED</option>
          </select>
        </div>
      </div>

      <p className="text-1xl pt-4">Budget & Schedule</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex-1">
          <span className="label label-text">Daily Budget Micro (Required)</span>
          <input
            type="number"
            id="ad_squad_daily_budget_micro"
            placeholder="E.g. 5 000 000 => $5"
            className="input input-bordered input-sm w-full"
            defaultValue={5000000}
          />
        </div>
        <div className="flex flex-col">
          <span className="label label-text">Delivery constraint (Required)</span>
          <select className="select select-bordered select-sm" id="ad_squad_delivery_constraint">
            <option value="DAILY_BUDGET">DAILY BUDGET</option>
            <option disabled value="LIFETIME_BUDGET">
              LIFETIME BUDGET
            </option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <span className="label label-text">Start time (Required)</span>
          <input type="datetime-local" id="ad_squad_start_time" className="input input-bordered input-sm w-full" />
        </div>
        <div className="flex-1">
          <span className="label label-text">End time (Optional)</span>
          <input type="datetime-local" id="ad_squad_end_time" className="input input-bordered input-sm w-full" />
        </div>
      </div>

      <p className="text-1xl pt-4 pb-2">Demographics</p>
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <span className="label label-text">Ages (Required)</span>
          <div className="flex items-center w-full">
            <input
              type="number"
              id="ad_squad_age_min_age"
              defaultValue={13}
              className="input input-bordered input-sm"
            />
            <div className="divider-horizontal">to</div>
            <input
              type="number"
              id="ad_squad_age_max_age"
              defaultValue={50}
              className="input input-bordered input-sm"
            />
          </div>
        </div>
        <div className="flex flex-1 flex-col">
          <span className="label label-text">Genders (Required)</span>
          <select className="select select-bordered select-sm" id="ad_squad_gender">
            <option value="ALL">ALL</option>
            <option value="MALE">MALE</option>
            <option value="FEMALE">FEMALE</option>
          </select>
        </div>
      </div>

      <p className="text-1xl pt-4 pb-2">Demographics</p>
      <div className="flex items-center gap-4">
        <div className="flex flex-1 flex-col">
          <span className="label label-text">Operating Systems (Required)</span>
          <select className="select select-bordered select-sm" id="ad_squad_os_type">
            <option value="iOS">iOS</option>
            <option value="Android">Android</option>
            <option value="ALL">ALL</option>
          </select>
        </div>
        <div className="flex flex-1 flex-col">
          <span className="label label-text">Operating Systems (Required)</span>
          <select className="select select-bordered select-sm" id="ad_squad_connection_type">
            <option value="ALL">ALL</option>
            <option value="CELL">CELL</option>
            <option value="WIFI">WIFI</option>
          </select>
        </div>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="flex items-center justify-between gap-4 px-4 py-2">
        <div className="text-1xl">
          {isLoading
            ? 'Loading...'
            : organizationID
            ? `Org ${selectedOrgName} has ${accounts.length} accounts.`
            : 'Please select your organization'}
        </div>
        <select value={organizationID} onChange={onSelectOrg} className="select select-bordered w-full max-w-xs">
          <option value="">Select organization</option>
          {organizations.map((organization: any) => (
            <option key={organization.id} value={organization.id}>
              {organization.name}
            </option>
          ))}
        </select>
      </div>
      {organizationID?.length > 0 && (
        <div className="flex flex-col">
          <form noValidate className="form-control grid grid-cols-2 gap-4 m-4" onSubmit={handleSubmit}>
            {CampaignSection}
            {AdSquadSection}
            <div className="flex">
              <button className="btn btn-active btn-primary" type="submit" disabled={disabledSubmit}>
                {`Create campaigns for selected accounts`}
              </button>
            </div>
          </form>
          <div className="w-full">
            {isAccountLoading ? <div className="text-2xl p-4">Loading ad accounts...</div> : renderTable()}
          </div>
          <CampaignModal
            modalID={viewCampaignCtx.modalID}
            campaigns={viewCampaignCtx.campaigns}
            loading={viewCampaignCtx.loading}
          />
        </div>
      )}
    </Layout>
  );
}